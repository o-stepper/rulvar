/**
 * OTel exporter (M5-T08 acceptance): span parentage mirrors event
 * spanIds, and an absent OTel dependency never breaks the CLI (the
 * exporter is typed against a structural TracerLike, imported and
 * exercised with an in-memory tracer, with no @opentelemetry/* package
 * present).
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  defineWorkflow,
  InMemoryStore,
  type WorkflowEvent,
  type TerminalEnvelope,
} from '@rulvar/core';

import { FakeAdapter, FAKE_MODEL_REF } from '@rulvar/testing';
import { toOtel, type SpanLike, type TracerLike } from './otel.js';

interface RecordedSpan {
  name: string;
  attributes: Record<string, string | number | boolean>;
  events: string[];
  status?: { code: number; message?: string };
  ended: boolean;
  startTime?: number;
  endTime?: number;
}

function inMemoryTracer(): { tracer: TracerLike; spans: RecordedSpan[] } {
  const spans: RecordedSpan[] = [];
  const tracer: TracerLike = {
    startSpan(name, options) {
      const record: RecordedSpan = {
        name,
        attributes: { ...options?.attributes },
        events: [],
        ended: false,
        ...(options?.startTime === undefined ? {} : { startTime: options.startTime }),
      };
      spans.push(record);
      const span: SpanLike = {
        setAttribute: (key, value) => {
          record.attributes[key] = value;
        },
        addEvent: (eventName) => {
          record.events.push(eventName);
        },
        setStatus: (status) => {
          record.status = status;
        },
        end: (endTime) => {
          record.ended = true;
          if (endTime !== undefined) {
            record.endTime = endTime;
          }
        },
      };
      return span;
    },
  };
  return { tracer, spans };
}

const wf = defineWorkflow({ name: 'review' }, async (ctx) => {
  const findings = await ctx.phase('scan', () => ctx.agent('scan the diff'));
  return { findings };
});

/** Replays a run's events into a collector so toOtel can consume them. */
async function runAndCollect(
  workflow: Parameters<ReturnType<typeof createEngine>['run']>[0] = wf,
): Promise<{
  runId: string;
  events: AsyncIterable<WorkflowEvent>;
  result: Promise<import('@rulvar/core').RunOutcome<unknown>>;
}> {
  const engine = createEngine({
    adapters: [new FakeAdapter({ agents: { '*': 'scanned' } })],
    stores: { journal: new InMemoryStore() },
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  });
  const handle = engine.run(workflow, undefined);
  const collected: WorkflowEvent[] = [];
  for await (const event of handle.events) {
    collected.push(event);
  }
  const outcome = await handle.result;
  return {
    runId: handle.runId,
    result: Promise.resolve(outcome),
    events: (async function* () {
      for (const event of collected) {
        yield await Promise.resolve(event);
      }
    })(),
  };
}

/** A minimal settled envelope for run:end literals (RV1105). */
function envelopeFor(runId: string, totalUsd: number): TerminalEnvelope {
  return {
    runId,
    workflow: 'wf',
    status: 'ok',
    settled: true,
    totalUsd,
    grossUsd: totalUsd,
    costByModel: {},
    usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    usageApprox: false,
    agentsSpawned: 1,
  };
}

describe('toOtel (M5-T08)', () => {
  it('maps the span tree 1:1 with rulvar.* and gen_ai.* attributes', async () => {
    const run = await runAndCollect();
    const { tracer, spans } = inMemoryTracer();
    const created = await toOtel(run, tracer);
    expect(created).toBeGreaterThan(0);

    // Every span carries the run id and closed cleanly.
    expect(spans.every((s) => s.attributes['rulvar.run_id'] === run.runId)).toBe(true);
    expect(spans.every((s) => s.ended)).toBe(true);

    // The hierarchy opened run, phase, agent spans by name.
    const names = spans.map((s) => s.name);
    expect(names.some((n) => n.startsWith('run '))).toBe(true);
    expect(names).toContain('phase scan');
    const agentSpan = spans.find((s) => s.name.startsWith('agent'));
    expect(agentSpan?.attributes['gen_ai.request.model']).toBe(FAKE_MODEL_REF);
    expect(agentSpan?.attributes['rulvar.agent_type']).toBe('');
    expect(agentSpan?.attributes['gen_ai.operation.name']).toBe('loop');

    // Content is NEVER exported: no prompt/completion attributes.
    for (const span of spans) {
      for (const key of Object.keys(span.attributes)) {
        expect(key.includes('prompt')).toBe(false);
        expect(key.includes('completion')).toBe(false);
      }
    }
  });

  it('the degradation mirror rides the run span (cycle 75)', async () => {
    const degraded = defineWorkflow({ name: 'degraded' }, () =>
      Promise.resolve({
        result: 'the merged report',
        completion: 'partial' as const,
        childStatusCounts: { ok: 1, limit: 1 },
        degradedReasons: ["child w2 settled 'limit' after the finalization reserve summary"],
        salvagedTerminalOutputChildren: ['w2'],
      }),
    );
    const run = await runAndCollect(degraded);
    const { tracer, spans } = inMemoryTracer();
    await toOtel(run, tracer);
    const runSpan = spans.find((s) => s.name.startsWith('run '));
    expect(runSpan?.attributes['rulvar.run.completion']).toBe('partial');
    expect(runSpan?.attributes['rulvar.run.degradedReasons']).toBe(
      JSON.stringify(["child w2 settled 'limit' after the finalization reserve summary"]),
    );
    expect(runSpan?.attributes['rulvar.run.salvagedTerminalOutputChildren']).toBe(
      JSON.stringify(['w2']),
    );
    expect(runSpan?.attributes['rulvar.run.salvagedPartialChildren']).toBeUndefined();
  });

  it('start/end timestamps come from the lifecycle events', async () => {
    const run = await runAndCollect();
    const { tracer, spans } = inMemoryTracer();
    await toOtel(run, tracer);
    const runSpan = spans.find((s) => s.name.startsWith('run '));
    expect(typeof runSpan?.startTime).toBe('number');
    expect(typeof runSpan?.endTime).toBe('number');
    expect((runSpan?.endTime ?? 0) >= (runSpan?.startTime ?? 0)).toBe(true);
  });

  it('contextApi plus setSpan produce real parent-child nesting', async () => {
    const run = await runAndCollect();
    const spans: RecordedSpan[] = [];
    const contexts: Array<{ name: string; parentContext: unknown }> = [];
    const bySpan = new Map<SpanLike, RecordedSpan>();
    const tracer: TracerLike = {
      startSpan(name, options, context) {
        const record: RecordedSpan = {
          name,
          attributes: { ...options?.attributes },
          events: [],
          ended: false,
        };
        spans.push(record);
        contexts.push({ name, parentContext: context });
        const span: SpanLike = {
          setAttribute: (key, value) => {
            record.attributes[key] = value;
          },
          addEvent: (eventName) => {
            record.events.push(eventName);
          },
          setStatus: (status) => {
            record.status = status;
          },
          end: () => {
            record.ended = true;
          },
        };
        bySpan.set(span, record);
        return span;
      },
    };
    const ACTIVE = { marker: 'active-context' };
    await toOtel(run, tracer, {
      contextApi: { active: () => ACTIVE, with: (_context, fn) => fn() },
      setSpan: (context, span) => ({ context, parent: bySpan.get(span) }),
    });

    // The run root has no parent context; every child span was started
    // with a context derived from its parent's span.
    const rootStart = contexts.find((c) => c.name.startsWith('run '));
    expect(rootStart?.parentContext).toBeUndefined();
    const phaseStart = contexts.find((c) => c.name === 'phase scan');
    const phaseParent = phaseStart?.parentContext as
      { context: unknown; parent?: RecordedSpan } | undefined;
    expect(phaseParent?.context).toBe(ACTIVE);
    expect(phaseParent?.parent?.name.startsWith('run ')).toBe(true);
    const agentStart = contexts.find((c) => c.name.startsWith('agent '));
    const agentParent = agentStart?.parentContext as
      { context: unknown; parent?: RecordedSpan } | undefined;
    expect(agentParent?.parent?.name).toBe('phase scan');
  });

  it('without the context options, spans stay flat: no parent context is passed', async () => {
    const run = await runAndCollect();
    const contexts: unknown[] = [];
    const { tracer } = inMemoryTracer();
    const spying: TracerLike = {
      startSpan(name, options, context) {
        contexts.push(context);
        return tracer.startSpan(name, options);
      },
    };
    await toOtel(run, spying);
    expect(contexts.every((context) => context === undefined)).toBe(true);
  });

  it('the exporter loads and runs with no @opentelemetry package present', () => {
    // Importing this module did not require any OTel package: toOtel is
    // a function typed against the structural TracerLike.
    expect(typeof toOtel).toBe('function');
  });
});

describe('run profile through the CLI (M5-T07)', () => {
  it('applies a shipped profile as data under host options', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-profile-'));
    const CORE = new URL('../../core/dist/index.js', import.meta.url).href;
    const TESTING = new URL('../../testing/dist/index.js', import.meta.url).href;
    writeFileSync(
      join(cwd, 'rulvar.config.mjs'),
      `import { defineWorkflow } from ${JSON.stringify(CORE)};
import { FakeAdapter, FAKE_MODEL_REF } from ${JSON.stringify(TESTING)};
export default {
  engineOptions: {
    adapters: [new FakeAdapter({ agents: { '*': 'ok' } })],
    defaults: { routing: { loop: FAKE_MODEL_REF, extract: FAKE_MODEL_REF } },
  },
  workflows: { demo: defineWorkflow({ name: 'demo' }, (ctx) => ctx.agent('go')) },
};
`,
      'utf8',
    );
    const { runCli } = await import('./cli-main.js');
    const out: string[] = [];
    const err: string[] = [];
    const code = await runCli(['run', 'demo', '--profile', 'fast'], {
      cwd,
      io: {
        out: (line) => out.push(line),
        err: (line) => err.push(line),
        isTTY: false,
        prompt: () => Promise.resolve(undefined),
      },
    });
    expect(code).toBe(0);
    expect(out.join('\n')).toContain('ok');
  });

  it('rejects an unknown profile', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'rulvar-profile-'));
    writeFileSync(join(cwd, 'rulvar.config.mjs'), 'export default { workflows: {} };\n', 'utf8');
    const { runCli } = await import('./cli-main.js');
    const err: string[] = [];
    const code = await runCli(['run', 'demo', '--profile', 'turbo'], {
      cwd,
      io: {
        out: () => undefined,
        err: (line) => err.push(line),
        isTTY: false,
        prompt: () => Promise.resolve(undefined),
      },
    });
    expect(code).toBe(1);
    expect(err.join('\n')).toContain("unknown run profile 'turbo'");
  });
});

describe('OTel attribute masking (M8-T04; docs/09 section 8)', () => {
  it('masks key-shaped strings in span attributes, defense in depth', async () => {
    const SECRET = 'sk-abc123def456ghi789jkl012';
    const ts = '2026-01-01T00:00:00.000Z';
    // eslint-disable-next-line @typescript-eslint/require-await
    async function* synthetic(): AsyncIterable<WorkflowEvent> {
      yield {
        runId: 'r1',
        seq: 0,
        ts,
        spanId: 's0',
        type: 'run:start',
        workflow: 'wf',
        resumed: false,
      };
      yield {
        runId: 'r1',
        seq: 1,
        ts,
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'reviewer',
        model: SECRET,
        role: 'loop',
      };
      yield {
        runId: 'r1',
        seq: 2,
        ts,
        spanId: 's1',
        type: 'agent:end',
        status: 'ok',
      } as unknown as WorkflowEvent;
      yield {
        runId: 'r1',
        seq: 3,
        ts,
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0,
      } as unknown as WorkflowEvent;
    }
    const { tracer, spans } = inMemoryTracer();
    const result = Promise.resolve({
      status: 'ok',
      dropped: [],
      pending: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, byAgentType: {}, byRole: {}, unpriced: [] },
    } as unknown as import('@rulvar/core').RunOutcome<unknown>);
    await toOtel({ runId: 'r1', events: synthetic(), result }, tracer);
    const agent = spans.find((span) => span.name.startsWith('agent'));
    expect(agent).toBeDefined();
    expect(agent?.attributes['gen_ai.request.model']).toBe('[masked-secret]');
    expect(JSON.stringify(spans)).not.toContain(SECRET);
  });
});

describe('toOtel unsettled terminals (RV907)', () => {
  const at = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();
  const stream = (events: WorkflowEvent[]): AsyncIterable<WorkflowEvent> =>
    (async function* () {
      for (const event of events) {
        yield await Promise.resolve(event);
      }
    })();
  const result = Promise.resolve({
    status: 'ok',
    dropped: [],
    pending: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    cost: { totalUsd: 0, byModel: {}, byPhase: {}, byAgentType: {}, byRole: {}, unpriced: [] },
  } as unknown as import('@rulvar/core').RunOutcome<unknown>);

  it('a run:end carrying settled false is never a green span', async () => {
    const base = { runId: 'ru', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(10),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0,
        settled: false,
      } as unknown as WorkflowEvent,
    ];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'ru', events: stream(events), result }, tracer);
    const runSpan = spans.find((span) => span.name.startsWith('run '));
    expect(runSpan?.attributes['rulvar.run.settled']).toBe(false);
    // The computed status stays visible, but the span status refuses
    // green: nothing durable records this terminal.
    expect(runSpan?.attributes['rulvar.status']).toBe('ok');
    expect(runSpan?.status?.code).toBe(2);
  });

  it('a superseded terminal stamps the distinct reason and still refuses green (RV1009)', async () => {
    const base = { runId: 'rv', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(10),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0,
        settled: false,
        settledReason: 'superseded',
      } as unknown as WorkflowEvent,
    ];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rv', events: stream(events), result }, tracer);
    const runSpan = spans.find((span) => span.name.startsWith('run '));
    expect(runSpan?.attributes['rulvar.run.settled']).toBe(false);
    expect(runSpan?.attributes['rulvar.run.settled_reason']).toBe('superseded');
    expect(runSpan?.status?.code).toBe(2);
    expect(runSpan?.status?.message).toContain('successor');
  });

  it('a settled terminal keeps its green span and carries no settled attribute', async () => {
    const base = { runId: 'rs', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(10),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0,
        envelope: envelopeFor('rs', 0),
      },
    ];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rs', events: stream(events), result }, tracer);
    const runSpan = spans.find((span) => span.name.startsWith('run '));
    expect(runSpan?.attributes['rulvar.run.settled']).toBeUndefined();
    expect(runSpan?.status?.code).toBe(1);
  });

  it('the run span mirrors the terminal envelope money and agent facts (RV1105)', async () => {
    const base = { runId: 'rv', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(10),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 1.25,
        envelope: { ...envelopeFor('rv', 1.25), agentsSpawned: 3 },
      },
    ];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rv', events: stream(events), result }, tracer);
    const runSpan = spans.find((span) => span.name.startsWith('run '));
    expect(runSpan?.attributes['rulvar.run.total_usd']).toBe(1.25);
    expect(runSpan?.attributes['rulvar.run.agents_spawned']).toBe(3);
  });

  it('a persisted run:end from an older engine (no envelope) still closes the span', async () => {
    const base = { runId: 'rl', seq: 0 };
    const legacyEnd = {
      ...base,
      ts: at(10),
      spanId: 's0',
      type: 'run:end',
      status: 'ok',
      totalUsd: 0,
    } as unknown as WorkflowEvent;
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      legacyEnd,
    ];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rl', events: stream(events), result }, tracer);
    const runSpan = spans.find((span) => span.name.startsWith('run '));
    expect(runSpan?.status?.code).toBe(1);
    expect(runSpan?.attributes['rulvar.run.total_usd']).toBeUndefined();
  });
});

describe('toOtel invocation spans (RV-207)', () => {
  const okResult = Promise.resolve({
    status: 'ok',
    dropped: [],
    pending: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    cost: { totalUsd: 0, byModel: {}, byPhase: {}, byAgentType: {}, byRole: {}, unpriced: [] },
  } as unknown as import('@rulvar/core').RunOutcome<unknown>);
  const at = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();
  const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const toStream = (events: WorkflowEvent[]): AsyncIterable<WorkflowEvent> =>
    (async function* () {
      for (const event of events) {
        yield await Promise.resolve(event);
      }
    })();

  it('phase pairs become ended child spans and the agent span covers the whole dispatch', async () => {
    const base = { runId: 'r2', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'reviewer',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        type: 'agent:phase:start',
        agentType: 'reviewer',
        role: 'loop',
        model: 'fake:model',
        invocation: 1,
      },
      {
        ...base,
        ts: at(60),
        spanId: 's1',
        type: 'agent:phase:end',
        agentType: 'reviewer',
        role: 'loop',
        model: 'fake:model',
        invocation: 1,
        durationMs: 59,
        usage,
        costUsd: 0.01,
        outcome: 'ok',
        retries: 2,
      },
      {
        ...base,
        ts: at(60),
        spanId: 's1',
        type: 'agent:phase:start',
        agentType: 'reviewer',
        role: 'extract',
        model: 'fake:extract',
        invocation: 2,
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:phase:end',
        agentType: 'reviewer',
        role: 'extract',
        model: 'fake:extract',
        invocation: 2,
        durationMs: 10,
        usage,
        costUsd: 0.002,
        outcome: 'ok',
      },
      {
        ...base,
        ts: at(71),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'reviewer',
        status: 'ok',
        usage,
        costUsd: 0.012,
        entryRef: 2,
        retryCount: 2,
      },
      {
        ...base,
        ts: at(72),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0.012,
        envelope: envelopeFor('r2', 0.012),
      },
    ];
    const { tracer, spans } = inMemoryTracer();
    const created = await toOtel(
      { runId: 'r2', events: toStream(events), result: okResult },
      tracer,
    );
    // run + agent + two invocation children.
    expect(created).toBe(4);
    expect(spans.every((span) => span.ended)).toBe(true);
    const agent = spans.find((span) => span.name.startsWith('agent '));
    expect(agent?.startTime).toBe(Date.parse(at(1)));
    expect(agent?.endTime).toBe(Date.parse(at(71)));
    expect(agent?.attributes['rulvar.retry_count']).toBe(2);
    expect(agent?.attributes['gen_ai.usage.input_tokens']).toBe(10);
    const invocations = spans.filter((span) => span.name.startsWith('invocation '));
    expect(invocations.map((span) => span.name)).toEqual(['invocation loop', 'invocation extract']);
    expect(invocations[0]?.attributes['rulvar.retries']).toBe(2);
    expect(invocations[0]?.attributes['rulvar.cost_usd']).toBe(0.01);
    expect(invocations[1]?.attributes['gen_ai.request.model']).toBe('fake:extract');
    expect(invocations[1]?.attributes['rulvar.invocation']).toBe(2);
  });

  it('a pre-RV-207 stream with extra per-phase agent:start events cannot leak spans', async () => {
    // The published-1.48.0 shape: several live agent:start on ONE span,
    // one agent:end. The exporter must keep exactly one agent span and
    // end it (before the guard, the second opener overwrote the first,
    // which then never ended, and the closed one measured only the last
    // phase).
    const base = { runId: 'r3', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'reviewer',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        ts: at(50),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'reviewer',
        model: 'fake:extract',
        role: 'extract',
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'reviewer',
        status: 'ok',
        usage,
        costUsd: 0.01,
        entryRef: 2,
      },
      {
        ...base,
        ts: at(71),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0.01,
        envelope: envelopeFor('r3', 0.01),
      },
    ];
    const { tracer, spans } = inMemoryTracer();
    const created = await toOtel(
      { runId: 'r3', events: toStream(events), result: okResult },
      tracer,
    );
    expect(created).toBe(2);
    const agents = spans.filter((span) => span.name.startsWith('agent '));
    expect(agents).toHaveLength(1);
    expect(agents[0]?.ended).toBe(true);
    // The single span covers the WHOLE dispatch, first start to end.
    expect(agents[0]?.startTime).toBe(Date.parse(at(1)));
    expect(agents[0]?.endTime).toBe(Date.parse(at(70)));
  });
});

describe('toOtel tool spans (RV802)', () => {
  const okResult = Promise.resolve({
    status: 'ok',
    dropped: [],
    pending: [],
    usage: { inputTokens: 0, outputTokens: 0 },
    cost: { totalUsd: 0, byModel: {}, byPhase: {}, byAgentType: {}, byRole: {}, unpriced: [] },
  } as unknown as import('@rulvar/core').RunOutcome<unknown>);
  const at = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();
  const usage = { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 };
  const toStream = (events: WorkflowEvent[]): AsyncIterable<WorkflowEvent> =>
    (async function* () {
      for (const event of events) {
        yield await Promise.resolve(event);
      }
    })();

  it('tools are child spans and the agent span survives to agent:end with its attributes', async () => {
    // The twelfth experiment's P0 #2, in miniature: all 569 tool events
    // of the live stream rode the 12 agent spanIds; tool:start was
    // swallowed as a duplicate opener, the FIRST tool:end closed the
    // agent span with the tool's outcome and timestamp, and the late
    // agent:end attached usage, cost, and exploration to nothing.
    const base = { runId: 'rt', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'researcher',
        model: 'fake:model',
        role: 'loop',
      },
      { ...base, ts: at(2), spanId: 's1', type: 'tool:start', toolName: 'search' },
      {
        ...base,
        ts: at(20),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        outcome: 'ok',
        durationMs: 18,
      },
      // Two tools in flight at once, one of them a same-name repeat:
      // the synthetic pair key must keep all three executions distinct.
      { ...base, ts: at(21), spanId: 's1', type: 'tool:start', toolName: 'search' },
      { ...base, ts: at(22), spanId: 's1', type: 'tool:start', toolName: 'fetch' },
      {
        ...base,
        ts: at(40),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        outcome: 'ok',
        durationMs: 19,
      },
      {
        ...base,
        ts: at(45),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'fetch',
        outcome: 'denied',
        durationMs: 0,
        guard: 'per-tool-cap',
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'researcher',
        status: 'ok',
        usage,
        costUsd: 0.012,
        entryRef: 2,
        exploration: {
          toolCallsUsed: 3,
          distinctSignatures: 2,
          repeatedCalls: 1,
          duplicateResultCalls: 0,
          deniedRepeats: 0,
        },
      },
      { ...base, ts: at(72), spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.012 },
    ] as unknown as WorkflowEvent[];
    const { tracer, spans } = inMemoryTracer();
    const created = await toOtel(
      { runId: 'rt', events: toStream(events), result: okResult },
      tracer,
    );

    // run + agent + three tool executions: full event-to-span parity.
    expect(created).toBe(5);
    expect(spans.every((span) => span.ended)).toBe(true);
    // Every span closed by its own closer, none by the settle sweep
    // (the sweep ends without a timestamp).
    expect(spans.every((span) => typeof span.endTime === 'number')).toBe(true);

    // The agent span covers the whole dispatch and keeps its closing
    // attributes.
    const agent = spans.find((span) => span.name.startsWith('agent '));
    expect(agent?.startTime).toBe(Date.parse(at(1)));
    expect(agent?.endTime).toBe(Date.parse(at(70)));
    expect(agent?.attributes['gen_ai.usage.input_tokens']).toBe(10);
    expect(agent?.attributes['rulvar.cost_usd']).toBe(0.012);
    expect(agent?.attributes['rulvar.exploration.tool_calls_used']).toBe(3);
    expect(agent?.attributes['rulvar.status']).toBe('ok');

    // Three tool spans, FIFO-paired per (agent span, tool name).
    const tools = spans.filter((span) => span.name.startsWith('tool '));
    expect(tools.map((span) => span.name)).toEqual(['tool search', 'tool search', 'tool fetch']);
    expect(tools[0]?.startTime).toBe(Date.parse(at(2)));
    expect(tools[0]?.endTime).toBe(Date.parse(at(20)));
    expect(tools[1]?.startTime).toBe(Date.parse(at(21)));
    expect(tools[1]?.endTime).toBe(Date.parse(at(40)));
    expect(tools[2]?.startTime).toBe(Date.parse(at(22)));
    expect(tools[2]?.endTime).toBe(Date.parse(at(45)));
    // The guard marker lands on the denied TOOL span, and the denial is
    // an error status on that span alone.
    expect(tools[2]?.attributes['rulvar.tool.guard']).toBe('per-tool-cap');
    expect(tools[2]?.attributes['rulvar.status']).toBe('denied');
    expect(tools[2]?.status?.code).toBe(2);
    expect(agent?.status?.code).toBe(1);
    expect(tools.every((span) => span.attributes['rulvar.tool_name'] !== undefined)).toBe(true);
  });

  it('a tool:end with no matching start attaches as a span event, never closes the agent', async () => {
    // Foreign or truncated streams stay tolerated: the exporter's
    // standing posture, now explicit for the unpaired closer.
    const base = { runId: 'rt2', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'researcher',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        ts: at(9),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        outcome: 'ok',
        durationMs: 3,
      },
      {
        ...base,
        ts: at(30),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'researcher',
        status: 'ok',
        usage,
        costUsd: 0.001,
        entryRef: 2,
      },
      { ...base, ts: at(31), spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.001 },
    ] as unknown as WorkflowEvent[];
    const { tracer, spans } = inMemoryTracer();
    const created = await toOtel(
      { runId: 'rt2', events: toStream(events), result: okResult },
      tracer,
    );
    expect(created).toBe(2);
    const agent = spans.find((span) => span.name.startsWith('agent '));
    expect(agent?.endTime).toBe(Date.parse(at(30)));
    expect(agent?.attributes['rulvar.cost_usd']).toBe(0.001);
    expect(agent?.events).toContain('tool:end');
  });

  it('events carrying toolCallId pair exactly: reverse-order ends keep their own durations and outcomes (RV908)', async () => {
    // The FIFO swap this closes: two same-name calls where the SECOND
    // finishes first used to close the FIRST span with the second's
    // timestamp and outcome.
    const base = { runId: 'rt3', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'researcher',
        model: 'fake:model',
        role: 'loop',
      },
      {
        ...base,
        ts: at(10),
        spanId: 's1',
        type: 'tool:start',
        toolName: 'search',
        toolCallId: 'call-a',
      },
      {
        ...base,
        ts: at(20),
        spanId: 's1',
        type: 'tool:start',
        toolName: 'search',
        toolCallId: 'call-b',
      },
      {
        ...base,
        ts: at(30),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        toolCallId: 'call-b',
        outcome: 'error',
        durationMs: 10,
      },
      {
        ...base,
        ts: at(60),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        toolCallId: 'call-a',
        outcome: 'ok',
        durationMs: 50,
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'researcher',
        status: 'ok',
        usage,
        costUsd: 0.001,
        entryRef: 2,
      },
      { ...base, ts: at(72), spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.001 },
    ] as unknown as WorkflowEvent[];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rt3', events: toStream(events), result: okResult }, tracer);
    const tools = spans.filter((span) => span.name.startsWith('tool '));
    expect(tools).toHaveLength(2);
    expect(tools[0]?.attributes['rulvar.tool.call_id']).toBe('call-a');
    expect(tools[0]?.startTime).toBe(Date.parse(at(10)));
    expect(tools[0]?.endTime).toBe(Date.parse(at(60)));
    expect(tools[0]?.attributes['rulvar.status']).toBe('ok');
    expect(tools[0]?.status?.code).toBe(1);
    expect(tools[1]?.attributes['rulvar.tool.call_id']).toBe('call-b');
    expect(tools[1]?.startTime).toBe(Date.parse(at(20)));
    expect(tools[1]?.endTime).toBe(Date.parse(at(30)));
    expect(tools[1]?.attributes['rulvar.status']).toBe('error');
    expect(tools[1]?.status?.code).toBe(2);
  });

  it('a stream without the field keeps the historical FIFO pairing byte for byte', async () => {
    // Old journals and foreign emitters carry no toolCallId: the
    // fallback is the exact RV802 behavior, swap included, so nothing
    // recorded before RV908 renders differently.
    const base = { runId: 'rt4', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'researcher',
        model: 'fake:model',
        role: 'loop',
      },
      { ...base, ts: at(10), spanId: 's1', type: 'tool:start', toolName: 'search' },
      { ...base, ts: at(20), spanId: 's1', type: 'tool:start', toolName: 'search' },
      {
        ...base,
        ts: at(30),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        outcome: 'error',
        durationMs: 10,
      },
      {
        ...base,
        ts: at(60),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        outcome: 'ok',
        durationMs: 50,
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'researcher',
        status: 'ok',
        usage,
        costUsd: 0.001,
        entryRef: 2,
      },
      { ...base, ts: at(72), spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.001 },
    ] as unknown as WorkflowEvent[];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rt4', events: toStream(events), result: okResult }, tracer);
    const tools = spans.filter((span) => span.name.startsWith('tool '));
    expect(tools).toHaveLength(2);
    // FIFO: the first end closes the FIRST start, whatever call it was.
    expect(tools[0]?.endTime).toBe(Date.parse(at(30)));
    expect(tools[0]?.attributes['rulvar.status']).toBe('error');
    expect(tools[1]?.endTime).toBe(Date.parse(at(60)));
    expect(tools[1]?.attributes['rulvar.status']).toBe('ok');
    expect(tools.every((span) => span.attributes['rulvar.tool.call_id'] === undefined)).toBe(true);
  });

  it('an id-bearing tool:end whose start carried no id falls back to FIFO, and a true orphan stays a span event', async () => {
    const base = { runId: 'rt5', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(1),
        spanId: 's1',
        parentSpanId: 's0',
        type: 'agent:start',
        agentType: 'researcher',
        model: 'fake:model',
        role: 'loop',
      },
      { ...base, ts: at(10), spanId: 's1', type: 'tool:start', toolName: 'search' },
      {
        ...base,
        ts: at(30),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'search',
        toolCallId: 'call-x',
        outcome: 'ok',
        durationMs: 20,
      },
      // No start anywhere for this one: the orphan tolerance holds for
      // id-bearing closers exactly as before.
      {
        ...base,
        ts: at(40),
        spanId: 's1',
        type: 'tool:end',
        toolName: 'fetch',
        toolCallId: 'call-y',
        outcome: 'ok',
        durationMs: 1,
      },
      {
        ...base,
        ts: at(70),
        spanId: 's1',
        type: 'agent:end',
        agentType: 'researcher',
        status: 'ok',
        usage,
        costUsd: 0.001,
        entryRef: 2,
      },
      { ...base, ts: at(72), spanId: 's0', type: 'run:end', status: 'ok', totalUsd: 0.001 },
    ] as unknown as WorkflowEvent[];
    const { tracer, spans } = inMemoryTracer();
    await toOtel({ runId: 'rt5', events: toStream(events), result: okResult }, tracer);
    const tools = spans.filter((span) => span.name.startsWith('tool '));
    expect(tools).toHaveLength(1);
    expect(tools[0]?.endTime).toBe(Date.parse(at(30)));
    expect(tools[0]?.attributes['rulvar.status']).toBe('ok');
    const agent = spans.find((span) => span.name.startsWith('agent '));
    expect(agent?.events).toContain('tool:end');
    expect(agent?.endTime).toBe(Date.parse(at(70)));
  });
});

describe('toOtel determinism events (RV-209)', () => {
  it('attaches determinism:warning as a span event with classification and code location', async () => {
    const okResult = Promise.resolve({
      status: 'ok',
      dropped: [],
      pending: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      cost: { totalUsd: 0, byModel: {}, byPhase: {}, byAgentType: {}, byRole: {}, unpriced: [] },
    } as unknown as import('@rulvar/core').RunOutcome<unknown>);
    const at = (ms: number): string => new Date(1_700_000_000_000 + ms).toISOString();
    const base = { runId: 'rd', seq: 0 };
    const events: WorkflowEvent[] = [
      { ...base, ts: at(0), spanId: 's0', type: 'run:start', workflow: 'wf', resumed: false },
      {
        ...base,
        ts: at(5),
        spanId: 's0',
        type: 'determinism:warning',
        category: 'bare-math-random',
        provenance: 'workflow',
        frame: 'at body (/app/wf.mjs:12:9)',
        file: '/app/wf.mjs',
        line: 12,
        column: 9,
      },
      {
        ...base,
        ts: at(10),
        spanId: 's0',
        type: 'run:end',
        status: 'ok',
        totalUsd: 0,
        envelope: envelopeFor('rd', 0),
      },
    ];
    const recorded: Array<{
      name: string;
      events: Array<{ name: string; attributes?: Record<string, string | number | boolean> }>;
    }> = [];
    const tracer: TracerLike = {
      startSpan(name) {
        const record: (typeof recorded)[number] = { name, events: [] };
        recorded.push(record);
        return {
          setAttribute: () => undefined,
          addEvent: (eventName, attributes) => {
            record.events.push({
              name: eventName,
              ...(attributes === undefined ? {} : { attributes }),
            });
          },
          setStatus: () => undefined,
          end: () => undefined,
        };
      },
    };
    await toOtel(
      {
        runId: 'rd',
        events: (async function* () {
          for (const event of events) {
            yield await Promise.resolve(event);
          }
        })(),
        result: okResult,
      },
      tracer,
    );
    const runSpan = recorded.find((span) => span.name.startsWith('run '));
    const warning = runSpan?.events.find((event) => event.name === 'determinism:warning');
    expect(warning).toBeDefined();
    expect(warning?.attributes?.['rulvar.determinism.category']).toBe('bare-math-random');
    expect(warning?.attributes?.['rulvar.determinism.provenance']).toBe('workflow');
    expect(warning?.attributes?.['code.filepath']).toBe('/app/wf.mjs');
    expect(warning?.attributes?.['code.lineno']).toBe(12);
  });
});

describe('OTel host redaction patterns (RV-217)', () => {
  const PII = 'ivan.petrov+medical@example.com';
  const ts = '2026-01-01T00:00:00.000Z';
  // eslint-disable-next-line @typescript-eslint/require-await
  async function* synthetic(): AsyncIterable<WorkflowEvent> {
    yield {
      runId: 'r1',
      seq: 0,
      ts,
      spanId: 's0',
      type: 'run:start',
      workflow: 'wf',
      resumed: false,
    } as unknown as WorkflowEvent;
    yield {
      runId: 'r1',
      seq: 1,
      ts,
      spanId: 's1',
      parentSpanId: 's0',
      type: 'agent:start',
      agentType: 'outreach',
      model: `contact-${PII}`,
      role: 'loop',
    } as unknown as WorkflowEvent;
    yield {
      runId: 'r1',
      seq: 2,
      ts,
      spanId: 's1',
      type: 'agent:end',
      status: 'ok',
    } as unknown as WorkflowEvent;
    yield {
      runId: 'r1',
      seq: 3,
      ts,
      spanId: 's0',
      type: 'run:end',
      status: 'ok',
    } as unknown as WorkflowEvent;
  }

  it('masks host PII in exported attributes on top of the default set', async () => {
    const attributes: Record<string, unknown>[] = [];
    const tracer = {
      startSpan: (name: string, options?: { attributes?: Record<string, unknown> }) => {
        attributes.push(options?.attributes ?? {});
        return {
          setAttribute: () => undefined,
          addEvent: () => undefined,
          setStatus: () => undefined,
          end: () => undefined,
        };
      },
    };
    await toOtel(
      { runId: 'r1', events: synthetic(), result: Promise.resolve({ status: 'ok' } as never) },
      tracer,
      { patterns: ['[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}'] },
    );
    const flat = JSON.stringify(attributes);
    expect(flat).not.toContain(PII);
    expect(flat).toContain('[masked-secret]');
  });

  it('rejects an invalid pattern typed before anything exports', async () => {
    await expect(
      toOtel(
        { runId: 'r1', events: synthetic(), result: Promise.resolve({ status: 'ok' } as never) },
        {
          startSpan: () => ({
            setAttribute: () => undefined,
            addEvent: () => undefined,
            setStatus: () => undefined,
            end: () => undefined,
          }),
        },
        { patterns: ['('] },
      ),
    ).rejects.toThrow(/not a valid regular expression/);
  });
});
