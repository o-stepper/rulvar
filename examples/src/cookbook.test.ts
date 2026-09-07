/**
 * The cookbook corpus as integration tests: every recipe runs through
 * the full engine on FakeAdapter with zero live calls (the MCP recipe
 * spawns a local stdio child; still zero model traffic). Each file
 * doubles as the runnable reference for
 * https://docs.rulvar.com/guide/cookbook.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  classifyEvidenceFile,
  createEngine,
  FINAL_COMPOSITION_LABEL,
  InMemoryStore,
  JsonlFileStore,
  orchestrate,
  RESEARCH_FAN_OUT_LIMITS,
  type ChatRequest,
  type JournalEntry,
} from '@rulvar/core';
import { FakeAdapter, fakeToolCalls, FAKE_MODEL_REF, type FakeCall } from '@rulvar/testing';

import { evidenceResearchOptions } from './cookbook-evidence-research.js';
import { assembleFanOut } from './cookbook-fan-out.js';
import { explainStrictFailure, strictSuccessOptions } from './cookbook-strict-success.js';
import {
  isPartial,
  partialRecoveryOptions,
  type PartialEnvelope,
} from './cookbook-partial-recovery.js';
import { briefThenSummarize, runThenResume } from './cookbook-resume-replay.js';
import { boundedBudgetOptions, rootCeiling } from './cookbook-bounded-budget.js';
import { migrationWithApproval } from './cookbook-hitl-suspension.js';
import {
  hardenedToolExecutor,
  isolatedWriterProfile,
  outOfProcessTools,
  sandboxedTool,
} from './cookbook-isolated-tools.js';

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
  capsOverrides?: ConstructorParameters<typeof FakeAdapter>[0]['capsOverrides'],
) {
  const adapter = new FakeAdapter({
    agents,
    ...(capsOverrides === undefined ? {} : { capsOverrides }),
  });
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
  it('the same declared ceiling admits at genesis and is refused after real spend', async () => {
    // The fake calls are PRICED (capsOverrides.pricing): input rates
    // stay low so prompt noise stays noise, and the counter's long
    // report is what actually moves the dollars. Both spawns declare
    // the SAME child ceiling, so the only difference between their
    // verdicts is the money the first child really spent.
    let orchTurn = 0;
    const { adapter, store, engine } = engineWith(
      {
        // About 150k output tokens, so about 1.2 USD at 8 USD per
        // MTok, well inside the declared 1.4 USD child ceiling.
        'count the beans': 'bean '.repeat(120_000).trimEnd(),
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          if (orchTurn === 1) {
            return fakeToolCalls({
              name: 'spawn_agent',
              args: { agentType: 'counter', prompt: 'count the beans', budgetUsd: 1.4 },
            });
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles: handlesIn(call.req) } });
          }
          if (orchTurn === 3) {
            // The identical ask again. At genesis 1.4 fit the fresh
            // ceiling; now the remainder is real spend short of
            // funding it, and admission refuses on those dollars.
            return fakeToolCalls({
              name: 'spawn_agent',
              args: { agentType: 'counter', prompt: 'count the beans', budgetUsd: 1.4 },
            });
          }
          return fakeToolCalls({
            name: 'finish',
            args: { result: 'counted what the budget funded' },
          });
        },
      },
      { counter: { description: 'counts one bag' } },
      { pricing: { inputUsdPerMTok: 10, outputUsdPerMTok: 8 } },
    );
    const outcome = await orchestrate(
      engine,
      'count every bag the budget allows',
      boundedBudgetOptions({ orchestratorCapUsd: 2, finalizeReserveUsd: 0.1 }),
      { ...rootCeiling(2), runId: 'CB-BUDGET' },
    ).result;
    expect(outcome.status).toBe('ok');
    const decisions = decisionsOf(await store.load('CB-BUDGET'), 'spawn-admission').map((e) => {
      const value = e.value as {
        spec?: { budgetUsd?: number };
        decision?: { verdict?: { kind?: string; reason?: { code?: string } } };
      };
      return {
        declared: value.spec?.budgetUsd,
        kind: value.decision?.verdict?.kind,
        code: value.decision?.verdict?.reason?.code,
      };
    });
    expect(decisions.map((d) => d.declared)).toEqual([1.4, 1.4]);
    expect(decisions.map((d) => d.kind)).toEqual(['admit', 'reject']);
    expect(decisions[1]?.code).toBe('budget');
    // The refusal reached the model as a typed tool error, not a crash.
    const conversation = JSON.stringify(adapter.calls.at(-1)?.req.messages ?? []);
    expect(conversation).toContain('rejected');
    // Real dollars moved, and the root ceiling held over them.
    expect(outcome.cost.totalUsd).toBeGreaterThan(1);
    expect(outcome.cost.totalUsd).toBeLessThanOrEqual(2);
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

  it(
    'the hardened executor scrubs the host environment: a tool cannot read a host secret',
    { timeout: 20000 },
    async () => {
      const runnerDir = mkdtempSync(join(tmpdir(), 'rulvar-cookbook-exec-'));
      const runner = join(runnerDir, 'runner.cjs');
      writeFileSync(
        runner,
        "let i='';process.stdin.on('data',c=>i+=c);process.stdin.on('end',()=>{" +
          'process.stdout.write(JSON.stringify({secret:process.env.COOKBOOK_HOST_SECRET??null,' +
          'token:process.env.TOOL_TOKEN??null}));process.exit(0);});',
        'utf8',
      );
      process.env.COOKBOOK_HOST_SECRET = 'sk-live-cookbook';
      try {
        let toolResult: { secret?: unknown; token?: unknown } | undefined;
        const adapter = new FakeAdapter({
          agents: {
            '*': (call: FakeCall) => {
              const parts = (call.req.messages ?? []).flatMap(
                (m) => (m as { parts?: Array<Record<string, unknown>> }).parts ?? [],
              );
              const tr = [...parts].reverse().find((p) => p.type === 'tool-result');
              if (tr !== undefined) {
                toolResult = tr.result as { secret?: unknown; token?: unknown };
                return 'done';
              }
              return fakeToolCalls({ name: 'sandboxed', args: {} });
            },
          },
        });
        const engine = createEngine({
          adapters: [adapter],
          stores: { journal: new InMemoryStore({ quiet: true }) },
          defaults: { routing: ROUTING, profiles: {} },
          executors: { subprocess: hardenedToolExecutor() },
        });
        const tool = sandboxedTool(process.execPath, [runner]);
        const { defineWorkflow } = await import('@rulvar/core');
        const wf = defineWorkflow({ name: 'hardened-exec' }, async (ctx) => {
          await ctx.agent('read the host secret via the sandboxed tool', { tools: [tool] });
        });
        const outcome = await engine.run(wf, undefined, { runId: 'CB-HARDENED' }).result;
        expect(outcome.status).toBe('ok');
        // The host secret was scrubbed; the per-call scoped token WAS injected.
        expect(toolResult?.secret).toBeNull();
        expect(toolResult?.token).toBe('scoped-and-short-lived');
      } finally {
        delete process.env.COOKBOOK_HOST_SECRET;
      }
    },
  );
});

describe('research fan out (cookbook)', () => {
  // The tenth comparison experiment's shape in miniature: a frozen
  // question, four specialists on one model class, and a repository
  // whose sources span the four evidence categories the task demands.
  const QUESTION =
    '# Frozen question\n\nMap the error boundary of this repository. Cite the implementation, ' +
    'its tests, the documentation, and an example.\n';
  const ROLES = {
    'integration-architecture': 'Own the target architecture and the API mapping.',
    'reliability-economics': 'Own replay identity, budgets, and pricing.',
    'security-operations': 'Own trust boundaries, permissions, and operations.',
    'verification-migration': 'Own determinism, evals, and the migration plan.',
  };
  const SOURCES = {
    'src/engine.ts': 'export const boundary = 1;\n',
    'src/engine.test.ts': "it('holds the boundary', () => {});\n",
    'docs/guide.md': '# Guide\n\nThe boundary is one.\n',
    'examples/demo.ts': 'export const demo = 1;\n',
  };
  const DISTRIBUTION = { implementation: 1, tests: 1, docs: 1, examples: 1 };
  const INSTRUCTIONS = 'Return one self contained Markdown RFC and preserve every citation.';
  const RFC =
    'RFC: the boundary is one (src/engine.ts:1, src/engine.test.ts:1, docs/guide.md:1, ' +
    'examples/demo.ts:1).';

  function repository(): string {
    const root = mkdtempSync(join(tmpdir(), 'rulvar-fan-out-'));
    for (const [rel, text] of Object.entries({ 'benchmark-question.md': QUESTION, ...SOURCES })) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text, 'utf8');
    }
    return root;
  }

  it('refuses a question file the research tools could never list', () => {
    const root = repository();
    mkdirSync(join(root, 'experiments'));
    writeFileSync(join(root, 'experiments', 'benchmark-question.md'), QUESTION, 'utf8');
    // The harness's exact seam: the file under a directory the profile ignores.
    expect(() =>
      assembleFanOut({
        root,
        questionFile: 'experiments/benchmark-question.md',
        ignore: ['experiments'],
        roles: ROLES,
        budgetUsd: 1,
        evidence: { minEntries: 4 },
      }),
    ).toThrow(/invisible to the research tools/);
    // A missing file fails at assembly, not in four specialists.
    expect(() =>
      assembleFanOut({
        root,
        questionFile: 'missing.md',
        roles: ROLES,
        budgetUsd: 1,
        evidence: { minEntries: 4 },
      }),
    ).toThrow(/ENOENT/);
  });

  it('four briefed specialists read the frozen question, spread their evidence, and the synthesis settles complete', async () => {
    const root = repository();
    const recipe = assembleFanOut({
      root,
      questionFile: 'benchmark-question.md',
      roles: ROLES,
      budgetUsd: 1,
      evidence: { minEntries: 4, distribution: DISTRIBUTION },
      synthesisInstructions: INSTRUCTIONS,
    });

    // The option shape, before any run: the goal carries the question
    // and the roster, the coordinator gets one spare seat, every child
    // gets the goal as its brief, the acceptance is the preset's with
    // the forecast raised to 'degrade', and the synthesis composes over
    // full child outputs.
    expect(recipe.goal.startsWith(QUESTION.trimEnd())).toBe(true);
    expect(recipe.goal).toContain('agentType=security-operations: Own trust boundaries');
    expect(recipe.options).toEqual({
      profiles: Object.keys(ROLES),
      maxSpawns: 5,
      childBrief: 'goal',
      acceptance: {
        childPolicy: 'all-ok',
        acceptPartialChildren: true,
        acceptValidatedTerminalOutputOnLimit: true,
        onUnreachable: 'degrade',
        requireEvidenceFloor: true,
        minSpawnedChildren: 4,
      },
      exposeChildResultTools: true,
      synthesis: { mode: 'single', context: 'full', policyFacts: true, instructions: INSTRUCTIONS },
    });
    // Every specialist profile carries the template's limits (the
    // window with the surplus turn, the reserve summary, the extension
    // with a tenth of the declared money as its headroom floor), the
    // declared money as estCost, and the contract with its spread.
    expect(Object.keys(recipe.profiles)).toEqual(Object.keys(ROLES));
    for (const [name, role] of Object.entries(ROLES)) {
      const profile = recipe.profiles[name];
      expect(profile?.description).toBe(role);
      expect(profile?.estCost).toBe(1);
      expect(profile?.evidenceContract).toEqual({ minEntries: 4, distribution: DISTRIBUTION });
      expect(profile?.limits).toEqual({
        ...RESEARCH_FAN_OUT_LIMITS,
        finalizationReserve: { maxOutputTokens: 8000 },
        toolBudgetExtension: {
          increment: 12,
          maxExtensions: 3,
          coverEvidenceDeficit: true,
          minHeadroomUsd: 0.1,
        },
      });
    }

    let orchTurn = 0;
    const firstPrompts = new Map<string, string>();
    const synthesisPrompts: string[] = [];
    const specialist = (name: string, call: FakeCall) => {
      const history = JSON.stringify(call.req.messages);
      if (!history.includes('"path":"benchmark-question.md"')) {
        // Turn one: the brief already carries the question, and the
        // file is readable through the research tools too.
        const opening = call.req.messages[0]?.parts.find((part) => part.type === 'text') as
          { text: string } | undefined;
        firstPrompts.set(name, opening?.text ?? '');
        return fakeToolCalls({ name: 'read_file', args: { path: 'benchmark-question.md' } });
      }
      if (!history.includes('"recorded":true')) {
        // Turn two: one verified citation per category the spread demands.
        return fakeToolCalls(
          ...Object.keys(SOURCES).map((file) => ({
            name: 'record_evidence',
            args: { claim: `${name}: the boundary as ${file} states it`, file, lines: '1' },
          })),
        );
      }
      return `${name} report: the boundary is one; see ${Object.keys(SOURCES).join(', ')}.`;
    };
    const adapter = new FakeAdapter({
      agents: {
        'You are the orchestrator': (call: FakeCall) => {
          orchTurn += 1;
          if (orchTurn === 1) {
            return fakeToolCalls({
              name: 'parallel_agents',
              args: {
                tasks: Object.keys(ROLES).map((name) => ({
                  agentType: name,
                  prompt: `Cover your area for the RFC: ${name}`,
                  budgetUsd: 1,
                })),
              },
            });
          }
          if (orchTurn === 2) {
            return fakeToolCalls({ name: 'await_all', args: { handles: handlesIn(call.req) } });
          }
          return fakeToolCalls({
            name: 'finish',
            args: { result: 'DRAFT: four specialist reports in hand' },
          });
        },
        // The goal names every role, so the specialists and the
        // synthesis are told apart by identity, never by a prompt regex.
        '*': (call: FakeCall) => {
          if (call.label === FINAL_COMPOSITION_LABEL) {
            synthesisPrompts.push(call.prompt);
            return fakeToolCalls({ name: 'finish', args: { result: RFC } });
          }
          if (call.agentType !== undefined && call.agentType in ROLES) {
            return specialist(call.agentType, call);
          }
          throw new Error(
            `unexpected dispatch: agentType='${call.agentType ?? ''}' label='${call.label ?? ''}'`,
          );
        },
      },
    });
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        // The synthesis runs under its own routing key.
        routing: { ...ROUTING, synthesize: FAKE_MODEL_REF },
        profiles: recipe.profiles,
      },
    });
    const outcome = await orchestrate(engine, recipe.goal, recipe.options, {
      budgetUsd: 12,
      runId: 'CB-FAN-OUT',
    }).result;
    expect(outcome.error?.message).toBeUndefined();
    expect(outcome.status).toBe('ok');
    const envelope = outcome.value as PartialEnvelope<string> & {
      childLimitProfile?: Record<string, number>;
      semanticPasses?: { synthesis?: { ran: boolean } };
    };
    // The completion observed: 'complete', four ok specialists, and the
    // settled value is the SYNTHESIS composed over their full reports,
    // never the coordinator's draft.
    expect(envelope.completion).toBe('complete');
    expect(envelope.childStatusCounts).toEqual({ ok: 4 });
    expect(envelope.result).toBe(RFC);
    expect(envelope.semanticPasses?.synthesis).toEqual({ ran: true });
    expect(synthesisPrompts).toHaveLength(1);
    for (const name of Object.keys(ROLES)) {
      expect(synthesisPrompts[0]).toContain(`${name} report:`);
    }
    // Every specialist read the goal (the question first) before its
    // own task, and read the frozen question through the tools too.
    expect([...firstPrompts.keys()].sort()).toEqual(Object.keys(ROLES).sort());
    for (const [name, prompt] of firstPrompts) {
      expect(prompt.startsWith(`${recipe.goal}\n\nCover your area for the RFC: ${name}`)).toBe(
        true,
      );
    }
    const specialistCalls = adapter.calls.filter(
      (call) => call.agentType !== undefined && call.agentType in ROLES,
    );
    expect(specialistCalls).toHaveLength(12);
    const readers = specialistCalls.filter((call) =>
      JSON.stringify(call.req.messages).includes('1: # Frozen question'),
    );
    expect(new Set(readers.map((call) => call.agentType)).size).toBe(4);
    // The coordinator was told the brief is automatic.
    const coordination = JSON.stringify(adapter.calls[0]?.req.messages[0]?.parts ?? []);
    expect(coordination).toContain('receives the GOAL above as its brief');
    // The acceptance judged the spread per specialist, and the roster
    // profile names what bound the children: nothing, this time.
    const [acceptance] = decisionsOf(await store.load('CB-FAN-OUT'), 'orchestrator_acceptance');
    const rows =
      (
        acceptance?.value as {
          children?: Array<{
            status: string;
            evidence?: { met: boolean; byCategory?: Record<string, unknown> };
          }>;
        }
      ).children ?? [];
    expect(rows).toHaveLength(4);
    for (const row of rows) {
      expect(row.status).toBe('ok');
      expect(row.evidence?.met).toBe(true);
      expect(row.evidence?.byCategory).toEqual({
        implementation: { recorded: 1, required: 1 },
        tests: { recorded: 1, required: 1 },
        docs: { recorded: 1, required: 1 },
        examples: { recorded: 1, required: 1 },
      });
    }
    expect(envelope.childLimitProfile).toEqual({
      children: 4,
      underToolBudget: 4,
      capHit: 0,
      windowEntered: 0,
      starved: 0,
      budgetUsedShareMedian: 0,
    });
    // Host side, every specialist owns four verified entries over the
    // four categories.
    const evidence = recipe.evidence();
    expect(Object.keys(evidence).sort()).toEqual(Object.keys(ROLES).sort());
    for (const entries of Object.values(evidence)) {
      expect(entries).toHaveLength(4);
      expect(new Set(entries.map((entry) => classifyEvidenceFile(entry.file)))).toEqual(
        new Set(['implementation', 'tests', 'docs', 'examples']),
      );
    }
  });
});
