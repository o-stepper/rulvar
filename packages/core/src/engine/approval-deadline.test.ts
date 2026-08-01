/**
 * The opt-in approval deadline (RV1107, the R18 judge item): a
 * suspended tool approval that nobody resolves within the configured
 * `permissions.approvalDeadlineMs` is DENIED by a journaled timeout
 * resolution instead of waiting forever. The deadline reuses the
 * flavor B escalation machinery end to end: the deadline is journaled
 * on the suspension entry (so it survives resume and re-arms FROM THE
 * ENTRY), the timeout is a resolution by 'timeout' through the
 * first-closing-wins arbiter (a racing live decision and the timeout
 * can never both apply), and the deny fails closed with a typed
 * reason the model sees as the denied tool result. Absent config is
 * the historical contract: the approval waits indefinitely.
 */
import { describe, expect, it } from 'vitest';

import { ConfigError, InvalidResolutionError } from '../l0/errors.js';
import { normalizeEntry, type JournalEntry } from '../l0/entries.js';
import { compilePermissionChain } from '../runtime/permission-chain.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { ExternalRegistry } from './external.js';
import { scriptedAdapter } from './test-harness.js';

function deployTool(executions: string[]) {
  return tool({
    name: 'deploy',
    description: 'deploys the site',
    parameters: { type: 'object' },
    needsApproval: true,
    execute: (input) => {
      executions.push(JSON.stringify(input));
      return Promise.resolve('deployed');
    },
  });
}

function approvalScript() {
  return scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'deploy', args: { site: 'prod' } } }
      : { text: 'release done' },
  );
}

async function entriesOf(journal: InMemoryStore, runId: string): Promise<JournalEntry[]> {
  return (await journal.load(runId)).map((entry) => normalizeEntry(entry));
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls the journal until a resolution entry exists (the timer fired). */
async function untilResolution(journal: InMemoryStore, runId: string): Promise<JournalEntry[]> {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const entries = await entriesOf(journal, runId);
    if (entries.some((entry) => entry.kind === 'resolution')) {
      return entries;
    }
    await sleep(10);
  }
  throw new Error('no resolution entry appeared');
}

describe('the opt-in approval deadline (RV1107)', () => {
  it('a parked approval denies by the journaled deadline; the resume continues with the typed refusal', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );

    // Process A: the ask verdict suspends; nobody resolves.
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 60 } },
    });
    const outcomeA = await engineA.run(wf, undefined, { runId: 'deadline-run' }).result;
    expect(outcomeA.status).toBe('suspended');

    // The deadline is journaled ON the suspension entry.
    const suspendedEntries = await entriesOf(journal, 'deadline-run');
    const approval = suspendedEntries.find((entry) => entry.kind === 'approval');
    expect(typeof approval?.deadlineAt).toBe('string');

    // The parked deadline fires in the SAME process: the timeout deny
    // lands durably while the run stays settled 'suspended'.
    const entries = await untilResolution(journal, 'deadline-run');
    const resolution = entries.find((entry) => entry.kind === 'resolution');
    expect(resolution?.resolution?.by).toBe('timeout');

    // Process B: the resume folds the deny; the tool never runs and the
    // model saw the typed refusal.
    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 60 } },
    });
    const outcomeB = await engineB.resume('deadline-run', wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(outcomeB.value).toBe('release done');
    expect(executions).toEqual([]);
    const toolResult = adapterB.calls[0]?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result') as
      { result: { error: string }; isError?: boolean } | undefined;
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result.error).toContain('denied by timeout');
  }, 15_000);

  it('a live allow before the deadline wins and cancels the timer: one resolution, ever', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const engine = createEngine({
      adapters: [approvalScript()],
      stores: { journal },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 60 } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const handle = engine.run(wf, undefined, { runId: 'live-allow' });
    handle.on('approval:pending', (event) => {
      const entryRef = (event as unknown as { entryRef: number }).entryRef;
      void handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), {
        decision: 'allow',
      });
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(executions).toEqual(['{"site":"prod"}']);
    // Wait past the deadline: the cancelled timer must never journal a
    // losing timeout attempt.
    await sleep(150);
    const entries = await entriesOf(journal, 'live-allow');
    const resolutions = entries.filter((entry) => entry.kind === 'resolution') as Array<
      JournalEntry & { resolution?: { by?: string } }
    >;
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.resolution?.by).toBe('external');
  }, 15_000);

  it('the deadline that fires is the JOURNALED one: a resume cycle keeps the entry deadline, not a recomputed config', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 200 } },
    });
    const outcomeA = await engineA.run(wf, undefined, { runId: 'rearm-run' }).result;
    expect(outcomeA.status).toBe('suspended');
    const journaledDeadline = (await entriesOf(journal, 'rearm-run')).find(
      (entry) => entry.kind === 'approval',
    )?.deadlineAt;
    expect(typeof journaledDeadline).toBe('string');

    // Process B resumes BEFORE the deadline: the approval re-parks and
    // the run settles suspended again; the re-armed timer keeps ticking
    // toward the ENTRY's deadline.
    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 200 } },
    });
    const outcomeB = await engineB.resume('rearm-run', wf).result;
    expect(outcomeB.status).toBe('suspended');

    // The deny that lands names the JOURNALED deadline in its reason: a
    // recomputed config deadline would carry a later timestamp, so this
    // pins the entry as the one source across the resume cycle.
    const entries = await untilResolution(journal, 'rearm-run');
    const resolution = entries.find((entry) => entry.kind === 'resolution') as
      (JournalEntry & { resolution?: { by?: string; value?: { reason?: string } } }) | undefined;
    expect(resolution?.resolution?.by).toBe('timeout');
    expect(resolution?.resolution?.value?.reason).toContain(journaledDeadline);

    // Process C folds the deny and completes with the typed refusal.
    const adapterC = scriptedAdapter(() => ({ text: 'release done' }));
    const engineC = createEngine({
      adapters: [adapterC],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 200 } },
    });
    const outcomeC = await engineC.resume('rearm-run', wf).result;
    expect(outcomeC.status).toBe('ok');
    expect(outcomeC.value).toBe('release done');
    expect(executions).toEqual([]);
  }, 15_000);

  it('a resume after the deadline crossed folds the recorded deny immediately', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 50 } },
    });
    const outcomeA = await engineA.run(wf, undefined, { runId: 'crossed-run' }).result;
    expect(outcomeA.status).toBe('suspended');
    await untilResolution(journal, 'crossed-run');

    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 50 } },
    });
    const outcomeB = await engineB.resume('crossed-run', wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(executions).toEqual([]);
    // The resumed process pays only the post-deny turn.
    expect(adapterB.calls).toHaveLength(1);
  }, 15_000);

  it('without the opt-in nothing changes: no journaled deadline, no timer, the wait is indefinite', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const engine = createEngine({
      adapters: [approvalScript()],
      stores: { journal },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const outcome = await engine.run(wf, undefined, { runId: 'no-optin' }).result;
    expect(outcome.status).toBe('suspended');
    const entries = await entriesOf(journal, 'no-optin');
    const approval = entries.find((entry) => entry.kind === 'approval');
    expect(approval).toBeDefined();
    expect(approval?.deadlineAt).toBeUndefined();
    await sleep(150);
    const later = await entriesOf(journal, 'no-optin');
    expect(later.filter((entry) => entry.kind === 'resolution')).toHaveLength(0);
  }, 15_000);

  it('the profile deadline overrides the engine default (most specific wins)', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { agentType: 'gated', tools: [deployTool(executions)] }),
    );
    const engine = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: {
        routing: { loop: 'fake:model' },
        // The engine default would never fire inside this test.
        permissions: { approvalDeadlineMs: 600_000 },
        profiles: { gated: { permissions: { approvalDeadlineMs: 60 } } },
      },
    });
    const outcomeA = await engine.run(wf, undefined, { runId: 'profile-run' }).result;
    expect(outcomeA.status).toBe('suspended');
    // The profile's 60ms deadline fires; the engine's ten minutes never
    // would inside this test.
    const entries = await untilResolution(journal, 'profile-run');
    const resolution = entries.find((entry) => entry.kind === 'resolution');
    expect(resolution?.resolution?.by).toBe('timeout');
  }, 15_000);

  it('the config is validated typed: a non-positive or fractional deadline refuses to compile', () => {
    for (const bad of [0, -100, 1.5, Number.NaN]) {
      expect(() => compilePermissionChain({ approvalDeadlineMs: bad })).toThrowError(ConfigError);
      expect(() => compilePermissionChain(undefined, { approvalDeadlineMs: bad })).toThrowError(
        ConfigError,
      );
    }
    expect(() => compilePermissionChain({ approvalDeadlineMs: 60_000 })).not.toThrow();
  });
});

const ESCALATE_ARGS = {
  kind: 'scope_bigger',
  scopeDelta: 'the migration spans nine services, not one',
  revisedEstimate: { usd: 40, turns: 90 },
  blockers: ['schema ownership unclear'],
};

function escalatingAdapter() {
  return scriptedAdapter((_req, call) =>
    call === 0
      ? { toolCall: { name: 'escalate', args: ESCALATE_ARGS } }
      : { text: 'finished normally instead' },
  );
}

function flavorBWorkflow(deadlineMs: number) {
  return defineWorkflow({ name: 'flavor-b-detached' }, async (ctx) => {
    const result = await ctx.agent('do the migration', {
      escalation: { flavor: 'B', deadlineMs },
      result: 'full',
    });
    return (result as { status: string }).status;
  });
}

/**
 * A store that serves its journal with the suspended entry's deadlineAt
 * mangled: the hostile-store arm of the corruption contract. The engine
 * must refuse typed instead of trusting the bytes into a timer.
 */
class MangledDeadlineStore extends InMemoryStore {
  override async load(runId: string): ReturnType<InMemoryStore['load']> {
    const entries = await super.load(runId);
    return entries.map((entry) => {
      const candidate = entry as { deadlineAt?: string };
      return candidate.deadlineAt === undefined ? entry : { ...entry, deadlineAt: 'not-a-date' };
    });
  }
}

describe('the detached resolution flavor and the deadline range (RV1203, RV1204)', () => {
  it('a settled timed approval resolves detached with the SAME ApprovalDecision an untimed one takes', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const handleA = engineA.run(wf, undefined, { runId: 'detached-allow' });
    const outcomeA = await handleA.result;
    expect(outcomeA.status).toBe('suspended');
    const approval = (await entriesOf(journal, 'detached-allow')).find(
      (entry) => entry.kind === 'approval',
    );
    expect(typeof approval?.deadlineAt).toBe('string');

    // The regression under test (RV1203): the detached path must accept
    // the plain ApprovalDecision for an ORDINARY tool approval whether
    // or not the opt-in deadline journaled on it.
    await handleA.resolveExternal(ExternalRegistry.approvalKey(approval?.seq ?? -1), {
      decision: 'allow',
    });
    const resolutions = (await entriesOf(journal, 'detached-allow')).filter(
      (entry) => entry.kind === 'resolution',
    ) as Array<JournalEntry & { resolution?: { by?: string } }>;
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.resolution?.by).toBe('external');

    // The resume folds the allow: the tool executes exactly once.
    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const outcomeB = await engineB.resume('detached-allow', wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(outcomeB.value).toBe('release done');
    expect(executions).toEqual(['{"site":"prod"}']);
  }, 15_000);

  it('a settled timed approval denies detached with a reason the model sees on resume', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const handleA = engineA.run(wf, undefined, { runId: 'detached-deny' });
    const outcomeA = await handleA.result;
    expect(outcomeA.status).toBe('suspended');
    const approval = (await entriesOf(journal, 'detached-deny')).find(
      (entry) => entry.kind === 'approval',
    );
    await handleA.resolveExternal(ExternalRegistry.approvalKey(approval?.seq ?? -1), {
      decision: 'deny',
      reason: 'the operator said no',
    });

    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const outcomeB = await engineB.resume('detached-deny', wf).result;
    expect(outcomeB.status).toBe('ok');
    expect(executions).toEqual([]);
    const toolResult = adapterB.calls[0]?.messages
      .filter((msg) => msg.role === 'tool')
      .flatMap((msg) => msg.parts)
      .find((part) => part.type === 'tool-result') as
      { result: { error: string }; isError?: boolean } | undefined;
    expect(toolResult?.isError).toBe(true);
    expect(toolResult?.result.error).toContain('the operator said no');
  }, 15_000);

  it('a detached ESCALATION still demands the EscalationDecision: the flavor, not the deadline, picks the validator', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handle = engine.run(flavorBWorkflow(600_000), undefined, { runId: 'detached-esc' });
    const pending = new Promise<number>((resolve) => {
      handle.on('approval:pending', (event) => {
        resolve((event as unknown as { entryRef: number }).entryRef);
      });
    });
    const entryRef = await pending;
    await handle.cancel('operator walked away');
    const outcome = await handle.result;
    expect(outcome.status).toBe('cancelled');

    // The plain ApprovalDecision is NOT an escalation decision.
    await expect(
      handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), { decision: 'allow' }),
    ).rejects.toThrowError(InvalidResolutionError);
    // The EscalationDecision applies detached.
    await handle.resolveExternal(ExternalRegistry.approvalKey(entryRef), { kind: 'accept' });
  }, 15_000);

  it("a timed approval on a tool literally NAMED 'escalate' still takes the ApprovalDecision: the journaled flavor, not the name, decides", async () => {
    // The one case the legacy fallback cannot classify: an ordinary
    // tool that shares the escalate tool's name AND opted into the
    // deadline. The explicit flavor journaled on the entry (RV1203)
    // disambiguates it.
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const escalateNamedTool = tool({
      name: 'escalate',
      description: 'raises the deployment barrier',
      parameters: { type: 'object' },
      needsApproval: true,
      execute: (input) => {
        executions.push(JSON.stringify(input));
        return Promise.resolve('raised');
      },
    });
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? { toolCall: { name: 'escalate', args: { site: 'prod' } } }
        : { text: 'release done' },
    );
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [escalateNamedTool] }),
    );
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const handle = engine.run(wf, undefined, { runId: 'escalate-named' });
    const outcome = await handle.result;
    expect(outcome.status).toBe('suspended');
    const approval = (await entriesOf(journal, 'escalate-named')).find(
      (entry) => entry.kind === 'approval',
    );
    expect(typeof approval?.deadlineAt).toBe('string');
    await handle.resolveExternal(ExternalRegistry.approvalKey(approval?.seq ?? -1), {
      decision: 'allow',
    });
    const resolutions = (await entriesOf(journal, 'escalate-named')).filter(
      (entry) => entry.kind === 'resolution',
    ) as Array<JournalEntry & { resolution?: { by?: string } }>;
    expect(resolutions).toHaveLength(1);
    expect(resolutions[0]?.resolution?.by).toBe('external');
  }, 15_000);

  it('the compile ceiling: a deadline too large to journal as a date refuses typed at both layers', async () => {
    expect(() =>
      compilePermissionChain({ approvalDeadlineMs: Number.MAX_SAFE_INTEGER }),
    ).toThrowError(ConfigError);
    expect(() =>
      compilePermissionChain(undefined, { approvalDeadlineMs: Number.MAX_SAFE_INTEGER }),
    ).toThrowError(ConfigError);

    // Through the engine the refusal is the SAME typed error, never the
    // generic 'Invalid time value' of an unchecked Date conversion.
    const executions: string[] = [];
    const engine = createEngine({
      adapters: [approvalScript()],
      defaults: {
        routing: { loop: 'fake:model' },
        permissions: { approvalDeadlineMs: Number.MAX_SAFE_INTEGER },
      },
    });
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const outcome = await engine.run(wf, undefined, { runId: 'huge-deadline' }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('deadline ceiling');
    expect(outcome.error?.message).not.toContain('Invalid time value');
  }, 15_000);

  it('the escalation deadlineMs shares the ceiling: flavor B refuses typed before any call', async () => {
    const adapter = escalatingAdapter();
    const engine = createEngine({
      adapters: [adapter],
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await engine.run(flavorBWorkflow(Number.MAX_SAFE_INTEGER), undefined, {
      runId: 'huge-esc-deadline',
    }).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toContain('deadline ceiling');
    expect(outcome.error?.message).not.toContain('Invalid time value');
  }, 15_000);

  it('importRun refuses a bundle whose journaled deadline does not parse as a date', async () => {
    const executions: string[] = [];
    const journal = new InMemoryStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const outcomeA = await engineA.run(wf, undefined, { runId: 'corrupt-bundle' }).result;
    expect(outcomeA.status).toBe('suspended');
    const bundle = await engineA.exportRun('corrupt-bundle');
    const mangled = {
      ...bundle,
      entries: bundle.entries.map((entry) =>
        (entry as { deadlineAt?: string }).deadlineAt === undefined
          ? entry
          : { ...entry, deadlineAt: 'not-a-date' },
      ),
    };
    const engineB = createEngine({
      adapters: [approvalScript()],
      stores: { journal: new InMemoryStore(), transcripts: new InMemoryTranscriptStore() },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    await expect(engineB.importRun(mangled as never)).rejects.toThrowError(ConfigError);
  }, 15_000);

  it('a store serving a mangled approval deadline gets a typed refusal, not a silent immediate deny', async () => {
    const executions: string[] = [];
    const journal = new MangledDeadlineStore();
    const transcripts = new InMemoryTranscriptStore();
    const wf = defineWorkflow({ name: 'release' }, async (ctx) =>
      ctx.agent('ship it', { tools: [deployTool(executions)] }),
    );
    const engineA = createEngine({
      adapters: [approvalScript()],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const outcomeA = await engineA.run(wf, undefined, { runId: 'corrupt-store' }).result;
    expect(outcomeA.status).toBe('suspended');

    const adapterB = scriptedAdapter(() => ({ text: 'release done' }));
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' }, permissions: { approvalDeadlineMs: 600_000 } },
    });
    const outcomeB = await engineB.resume('corrupt-store', wf).result;
    expect(outcomeB.status).toBe('error');
    expect(outcomeB.error?.message).toContain('does not parse as a date');
    // No silent deny ever landed and the tool never ran.
    const resolutions = (await entriesOf(journal, 'corrupt-store')).filter(
      (entry) => entry.kind === 'resolution',
    );
    expect(resolutions).toHaveLength(0);
    expect(executions).toEqual([]);
  }, 15_000);

  it('a mangled ESCALATION deadline refuses typed instead of resolving by the default decision immediately', async () => {
    const journal = new MangledDeadlineStore();
    const transcripts = new InMemoryTranscriptStore();
    const adapter = escalatingAdapter();
    const engineA = createEngine({
      adapters: [adapter],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const handleA = engineA.run(flavorBWorkflow(600_000), undefined, { runId: 'corrupt-esc' });
    const pending = new Promise<void>((resolve) => {
      handleA.on('approval:pending', () => {
        resolve();
      });
    });
    await pending;
    await handleA.cancel('park it for later');
    const outcomeA = await handleA.result;
    expect(outcomeA.status).toBe('cancelled');

    const adapterB = escalatingAdapter();
    const engineB = createEngine({
      adapters: [adapterB],
      stores: { journal, transcripts },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcomeB = await engineB.resume('corrupt-esc', flavorBWorkflow(600_000)).result;
    expect(outcomeB.status).toBe('error');
    expect(outcomeB.error?.message).toContain('does not parse as a date');
  }, 15_000);
});
