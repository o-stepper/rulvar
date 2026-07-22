/**
 * The cookbook corpus as integration tests: every recipe runs through
 * the full engine on FakeAdapter with zero live calls (the MCP recipe
 * spawns a local stdio child; still zero model traffic). Each file
 * doubles as the runnable reference for
 * https://docs.rulvar.com/guide/cookbook.
 */
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  createEngine,
  InMemoryStore,
  JsonlFileStore,
  orchestrate,
  type ChatRequest,
  type JournalEntry,
} from '@rulvar/core';
import { FakeAdapter, fakeToolCalls, FAKE_MODEL_REF, type FakeCall } from '@rulvar/testing';

import { evidenceResearchOptions } from './cookbook-evidence-research.js';
import { explainStrictFailure, strictSuccessOptions } from './cookbook-strict-success.js';
import {
  isPartial,
  partialRecoveryOptions,
  type PartialEnvelope,
} from './cookbook-partial-recovery.js';
import { briefThenSummarize, runThenResume } from './cookbook-resume-replay.js';
import { boundedBudgetOptions, rootCeiling } from './cookbook-bounded-budget.js';
import { migrationWithApproval } from './cookbook-hitl-suspension.js';
import { isolatedWriterProfile, outOfProcessTools } from './cookbook-isolated-tools.js';

const ROUTING = {
  loop: FAKE_MODEL_REF,
  extract: FAKE_MODEL_REF,
  orchestrate: FAKE_MODEL_REF,
} as const;

/** Spawn handles the model has seen so far, in first-seen order. */
function handlesIn(req: ChatRequest): number[] {
  const out: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number; handles?: number[] };
        if (typeof result?.handle === 'number' && !out.includes(result.handle)) {
          out.push(result.handle);
        }
        for (const handle of result?.handles ?? []) {
          if (!out.includes(handle)) {
            out.push(handle);
          }
        }
      }
    }
  }
  return out;
}

function decisionsOf(entries: readonly JournalEntry[], decisionType: string): JournalEntry[] {
  return entries.filter(
    (e) =>
      e.kind === 'decision' &&
      (e.value as { decisionType?: string } | undefined)?.decisionType === decisionType,
  );
}

function engineWith(
  agents: ConstructorParameters<typeof FakeAdapter>[0]['agents'],
  profiles: Record<string, object>,
) {
  const adapter = new FakeAdapter({ agents });
  const store = new InMemoryStore({ quiet: true });
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: ROUTING, profiles },
  });
  return { adapter, store, engine };
}

describe('evidence-preserving research (cookbook)', () => {
  const REPORT =
    'FINDINGS: two defects. EVIDENCE: src/auth.ts:10 src/db.ts:42 src/api.ts:7 confirm both.';
  const LOSSY = 'FINDINGS: fine. EVIDENCE: src/auth.ts:10 src/invented.ts:1 src/made.ts:2';
  const FULL =
    'FINDINGS: two defects. EVIDENCE: src/auth.ts:10 src/db.ts:42 src/api.ts:7 confirm both.';

  it('reads the full child report, rejects the lossy synthesis, accepts the repair', async () => {
    let orchTurn = 0;
    const { adapter, store, engine } = engineWith(
      {
        unearth: REPORT,
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          if (orchTurn === 1) {
            return fakeToolCalls({
              name: 'spawn_agent',
              args: { agentType: 'digger', prompt: 'unearth the citations' },
            });
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles: handlesIn(call.req) } });
          }
          if (orchTurn === 3) {
            // The digest is a 400 char wake signal; the recipe reads the
            // FULL report before synthesizing.
            return fakeToolCalls({
              name: 'get_child_result',
              args: { handle: handlesIn(call.req)[0] ?? -1 },
            });
          }
          return fakeToolCalls({
            name: 'finish',
            args: { result: orchTurn === 4 ? LOSSY : FULL },
          });
        },
      },
      { digger: { description: 'digs up cited evidence' } },
    );
    const outcome = await orchestrate(
      engine,
      'Audit the module; the report needs FINDINGS and EVIDENCE with citations.',
      evidenceResearchOptions({ sections: ['FINDINGS', 'EVIDENCE'] }),
      { budgetUsd: 5, runId: 'CB-EVIDENCE' },
    ).result;
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as PartialEnvelope<string>;
    expect(envelope.completion).toBe('complete');
    expect(envelope.result).toBe(FULL);
    // The full report reached the orchestrator through the evidence tool.
    const conversation = JSON.stringify(adapter.calls.at(-1)?.req.messages ?? []);
    expect(conversation).toContain('confirm both');
    // The lossy synthesis was rejected with BOTH defect kinds named.
    expect(conversation).toContain('src/db.ts:42');
    expect(conversation).toContain('unknown citations not present in any child report');
    const verdicts = decisionsOf(
      await store.load('CB-EVIDENCE'),
      'orchestrator_finish_validation',
    ).map((e) => (e.value as { verdict?: string }).verdict);
    expect(verdicts).toEqual(['repair', 'accepted']);
  });
});

describe('strict all-children-success (cookbook)', () => {
  function auditRun(childTurn: string | (() => never)) {
    let orchTurn = 0;
    return engineWith(
      {
        'inspect the module': childTurn,
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          if (orchTurn === 1) {
            return fakeToolCalls({
              name: 'spawn_agent',
              args: { agentType: 'inspector', prompt: 'inspect the module' },
            });
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles: handlesIn(call.req) } });
          }
          return fakeToolCalls({ name: 'finish', args: { result: 'signed off' } });
        },
      },
      { inspector: { description: 'inspects one module' } },
    );
  }

  it('a failed child fails the run typed; the helper reads the counts', async () => {
    const { engine } = auditRun(() => {
      throw new Error('the inspector crashed');
    });
    const outcome = await orchestrate(engine, 'audit strictly', strictSuccessOptions(), {
      budgetUsd: 5,
      runId: 'CB-STRICT-FAIL',
    }).result;
    expect(outcome.status).toBe('error');
    const failure = explainStrictFailure(outcome.error);
    expect(failure?.childStatusCounts).toEqual({ error: 1 });
    expect(failure?.degradedReasons[0]).toContain("settled 'error'");
    // Every other error stays undefined, so ordinary handling is untouched.
    expect(
      explainStrictFailure({ code: 'config', message: 'x', retryable: false }),
    ).toBeUndefined();
  });

  it('with every child ok the value is the complete envelope', async () => {
    const { engine } = auditRun('all clear');
    const outcome = await orchestrate(engine, 'audit strictly', strictSuccessOptions(), {
      budgetUsd: 5,
      runId: 'CB-STRICT-OK',
    }).result;
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as PartialEnvelope<string>;
    expect(envelope.completion).toBe('complete');
    expect(envelope.childStatusCounts).toEqual({ ok: 1 });
  });
});

describe('partial-result recovery (cookbook)', () => {
  it('accepts enough successes, names the degraded child, and recovers with a narrowed respawn', async () => {
    let orchTurn = 0;
    let betaHandle = -1;
    const { adapter, engine } = engineWith(
      {
        'scan the api': 'api scan complete',
        'scan the db': () => {
          throw new Error('the db scan timed out on the huge table');
        },
        'scan ONLY the small tables': 'small tables scanned',
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          const handles = handlesIn(call.req);
          if (orchTurn === 1) {
            return fakeToolCalls(
              { name: 'spawn_agent', args: { agentType: 'scanner', prompt: 'scan the api' } },
              { name: 'spawn_agent', args: { agentType: 'scanner', prompt: 'scan the db' } },
            );
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles } });
          }
          if (orchTurn === 3) {
            // Read WHY the db scan failed before deciding what to respawn.
            betaHandle = handles[1] ?? -1;
            return fakeToolCalls({ name: 'get_child_result', args: { handle: betaHandle } });
          }
          if (orchTurn === 4) {
            return fakeToolCalls({
              name: 'spawn_agent',
              args: { agentType: 'scanner', prompt: 'scan ONLY the small tables' },
            });
          }
          if (orchTurn === 5) {
            return fakeToolCalls({ name: 'await_all', args: { handles: [handles.at(-1) ?? -1] } });
          }
          return fakeToolCalls({
            name: 'finish',
            args: { result: 'api + small tables scanned; huge table deferred' },
          });
        },
      },
      { scanner: { description: 'scans one surface' } },
    );
    const outcome = await orchestrate(engine, 'scan everything', partialRecoveryOptions(2), {
      budgetUsd: 5,
      runId: 'CB-PARTIAL',
    }).result;
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as PartialEnvelope<string>;
    expect(isPartial(envelope)).toBe(true);
    expect(envelope.childStatusCounts).toEqual({ ok: 2, error: 1 });
    expect(envelope.degradedReasons).toHaveLength(1);
    // The recovery was evidence-informed: the failure reason reached the
    // orchestrator through get_child_result before the respawn.
    const conversation = JSON.stringify(adapter.calls.at(-1)?.req.messages ?? []);
    expect(conversation).toContain('the db scan timed out on the huge table');
  });
});

describe('resume and replay verification (cookbook)', () => {
  it('a fresh engine reproduces the value from the journal alone: zero calls, zero new bytes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-cookbook-'));
    const agents = {
      'Write a two sentence brief': 'Rulvar journals every step. Replay serves them back.',
      'Compress to one sentence': 'Journaled steps replay for free.',
    };
    const makeEngine = (adapter: FakeAdapter) =>
      createEngine({
        adapters: [adapter],
        stores: { journal: new JsonlFileStore({ dir }) },
        defaults: { routing: ROUTING, profiles: {} },
      });
    const adapterA = new FakeAdapter({ agents });
    const adapterB = new FakeAdapter({ agents });
    const report = await runThenResume(
      makeEngine(adapterA),
      makeEngine(adapterB),
      briefThenSummarize,
      { topic: 'durable runs' },
      'CB-REPLAY',
    );
    expect(report.firstValue).toBe('Journaled steps replay for free.');
    expect(report.identicalValue).toBe(true);
    // The proof half the report cannot see: not one provider call, not
    // one new journal byte.
    expect(adapterA.calls.length).toBeGreaterThan(0);
    expect(adapterB.calls).toHaveLength(0);
    const journalFile = readdirSync(dir).find((name) => name.endsWith('.jsonl'));
    expect(journalFile).toBeDefined();
    const bytes = readFileSync(join(dir, journalFile ?? ''), 'utf8');
    const resumedAgain = await makeEngine(new FakeAdapter({ agents })).resume(
      'CB-REPLAY',
      briefThenSummarize,
      { args: { topic: 'durable runs' } },
    ).result;
    expect(resumedAgain.value).toBe(report.firstValue);
    expect(readFileSync(join(dir, journalFile ?? ''), 'utf8')).toBe(bytes);
  });
});

describe('bounded-budget orchestration (cookbook)', () => {
  it('admits what the ceiling can fund, refuses the rest typed, and still finishes', async () => {
    let orchTurn = 0;
    const { adapter, store, engine } = engineWith(
      {
        'count the beans': 'beans counted',
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          if (orchTurn === 1) {
            // Two spawns: one the remaining root budget funds, one whose
            // declared child ceiling exceeds what is left. Admission
            // funds the first and refuses the second as a tool error the
            // model sees and works around.
            return fakeToolCalls(
              {
                name: 'spawn_agent',
                args: { agentType: 'counter', prompt: 'count the beans', budgetUsd: 0.04 },
              },
              {
                name: 'spawn_agent',
                args: { agentType: 'counter', prompt: 'count the beans', budgetUsd: 0.45 },
              },
            );
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles: handlesIn(call.req) } });
          }
          return fakeToolCalls({
            name: 'finish',
            args: { result: 'counted what the budget funded' },
          });
        },
      },
      { counter: { description: 'counts one bag' } },
    );
    const outcome = await orchestrate(
      engine,
      'count every bag the budget allows',
      boundedBudgetOptions({ orchestratorCapUsd: 1, finalizeReserveUsd: 0.05 }),
      { ...rootCeiling(1), runId: 'CB-BUDGET' },
    ).result;
    expect(outcome.status).toBe('ok');
    const admissions = decisionsOf(await store.load('CB-BUDGET'), 'spawn-admission').map(
      (e) => (e.value as { decision?: { verdict?: { kind?: string } } }).decision?.verdict?.kind,
    );
    expect(admissions).toEqual(['admit', 'reject']);
    // The refusal reached the model as a typed tool error, not a crash.
    const conversation = JSON.stringify(adapter.calls.at(-1)?.req.messages ?? []);
    expect(conversation).toContain('rejected');
    // Nothing priced here, and the ceiling held.
    expect(outcome.cost.totalUsd).toBeLessThanOrEqual(1);
  });
});

describe('long HITL suspension (cookbook)', () => {
  it('parks on the journaled deadline, takes the live decision, and reports salvage', async () => {
    let migratorTurn = 0;
    const adapter = new FakeAdapter({
      agents: {
        'Perform the migration': () => {
          migratorTurn += 1;
          return migratorTurn === 1
            ? fakeToolCalls({
                name: 'escalate',
                args: {
                  kind: 'scope_bigger',
                  scopeDelta: 'the migration spans nine services, not one',
                  revisedEstimate: { usd: 40, turns: 90 },
                  blockers: ['schema ownership unclear'],
                },
              })
            : 'never reached: the accepted escalation closes the loop terminally';
        },
      },
    });
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: { routing: ROUTING, profiles: {} },
      // The live decision channel: a human queue in production, a stub
      // here. It races the journaled deadline; first closing wins.
      onEscalation: () => ({ kind: 'accept', note: 'approved by the on call owner' }),
    });
    const outcome = await engine.run(
      migrationWithApproval,
      { task: 'move the payments schema' },
      { runId: 'CB-HITL' },
    ).result;
    expect(outcome.status).toBe('ok');
    const value = outcome.value;
    expect(value?.done).toBe(false);
    expect(value?.escalated?.kind).toBe('scope_bigger');
    expect(value?.escalated?.scopeDelta).toContain('nine services');
    expect(typeof value?.escalated?.costToDateUsd).toBe('number');
    expect(value?.escalated?.salvageTranscriptRef).not.toBe('');
    // The durable trail: the suspension with its deadline, the external
    // resolution that closed it, and the journaled decision.
    const entries = await store.load('CB-HITL');
    const approval = entries.find((e) => e.kind === 'approval');
    const resolution = entries.find((e) => e.kind === 'resolution');
    expect(approval?.deadlineAt).toBeDefined();
    expect(resolution?.resolution?.by).toBe('external');
    expect(decisionsOf(entries, 'escalation.decision')).toHaveLength(1);
  });
});

describe('isolated tool execution (cookbook)', () => {
  // The stdio fixture is a runnable script; bare specifiers would not
  // resolve from its temp directory, so it imports the MCP SDK's ESM
  // build by absolute file URL, resolved through @rulvar/core's own
  // dependency (examples does not depend on the SDK).
  const coreRequire = createRequire(createRequire(import.meta.url).resolve('@rulvar/core'));
  const sdkCjsEntry = coreRequire.resolve('@modelcontextprotocol/sdk/server/stdio.js');
  const sdkEsmDir = join(
    sdkCjsEntry.slice(0, sdkCjsEntry.lastIndexOf(join('dist', 'cjs'))),
    'dist',
    'esm',
  );
  const moduleUrl = (rel: string): string => pathToFileURL(join(sdkEsmDir, rel)).href;
  const stdioFixture = (): string => {
    const path = join(mkdtempSync(join(tmpdir(), 'rulvar-cookbook-mcp-')), 'stdio-server.mjs');
    writeFileSync(
      path,
      [
        `import { Server } from '${moduleUrl('server/index.js')}';`,
        `import { StdioServerTransport } from '${moduleUrl('server/stdio.js')}';`,
        `import { CallToolRequestSchema, ListToolsRequestSchema } from '${moduleUrl('types.js')}';`,
        '',
        "const server = new Server({ name: 'executor', version: '1.0.0' }, {",
        '  capabilities: { tools: {} },',
        '});',
        'server.setRequestHandler(ListToolsRequestSchema, () => ({',
        '  tools: [',
        "    { name: 'double', description: 'doubles a number', inputSchema: {",
        "      type: 'object', properties: { n: { type: 'number' } }, required: ['n'] } },",
        "    { name: 'pid', description: 'reports the executor pid', inputSchema: { type: 'object' } },",
        '  ],',
        '}));',
        'server.setRequestHandler(CallToolRequestSchema, (request) => {',
        "  if (request.params.name === 'pid') {",
        "    return { content: [{ type: 'text', text: String(process.pid) }] };",
        '  }',
        "  return { content: [{ type: 'text', text: String(Number(request.params.arguments?.n ?? 0) * 2) }] };",
        '});',
        'await server.connect(new StdioServerTransport());',
      ].join('\n'),
      'utf8',
    );
    return path;
  };
  /** Polls until the OS process is gone; false after three seconds. */
  const gone = async (pid: number): Promise<boolean> => {
    const deadline = Date.now() + 3000;
    for (;;) {
      try {
        process.kill(pid, 0);
      } catch {
        return true;
      }
      if (Date.now() > deadline) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  it(
    'runs the tools in a child process the engine closes with the run',
    { timeout: 20000 },
    async () => {
      const adapter = new FakeAdapter({
        agents: {
          'Double the number': (call: FakeCall) => {
            const conversation = JSON.stringify(call.req.messages);
            return conversation.includes('tool-result')
              ? 'the executor doubled it to 42'
              : fakeToolCalls({ name: 'pid', args: {} }, { name: 'double', args: { n: 21 } });
          },
        },
      });
      const engine = createEngine({
        adapters: [adapter],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        defaults: { routing: ROUTING, profiles: {} },
      });
      const source = outOfProcessTools(process.execPath, [stdioFixture()]);
      const { defineWorkflow } = await import('@rulvar/core');
      const wf = defineWorkflow({ name: 'isolated-double' }, async (ctx) =>
        String(
          await ctx.agent('Double the number 21 with the double tool.', {
            tools: [source],
            label: 'calc',
          }),
        ),
      );
      const outcome = await engine.run(wf, undefined, { runId: 'CB-ISOLATED' }).result;
      expect(outcome.status).toBe('ok');
      expect(outcome.value).toContain('42');
      // The tool ran OUT of this process: the pid the executor reported is
      // a real, different process...
      const results = JSON.stringify(adapter.calls.at(-1)?.req.messages ?? []);
      const pidMatch = /"result":"(\d+)"/.exec(results);
      const childPid = Number(pidMatch?.[1] ?? -1);
      expect(childPid).toBeGreaterThan(0);
      expect(childPid).not.toBe(process.pid);
      expect(results).toContain('"42"');
      // ...and closing the source releases it: the host owns the source
      // lifecycle exactly like a connection pool, and a repeated close is
      // a noop.
      await source.close();
      expect(await gone(childPid)).toBe(true);
    },
  );

  it('the worktree profile shape isolates file writes as a patch artifact', () => {
    const profile = isolatedWriterProfile([]);
    expect(profile.isolation).toEqual({ kind: 'worktree' });
    expect(profile.tools).toEqual([]);
    expect(profile.description).toContain('patch artifact');
  });
});
