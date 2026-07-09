import { describe, expect, it } from 'vitest';
import { createEngine, InMemoryStore } from '@lurker/core';
import type { ChatRequest, JournalEntry } from '@lurker/core';

import { planHash } from './plan-hash.js';
import { emptyPlan } from './plan-state.js';
import { orchestratePlanned } from './plan-runner.js';
import { decisionOriginOf, escalationDecisionKey, resolvedByOf } from './escalation.js';
import { agentTypeOf, lastToolResult, scriptedAdapter, type ScriptedTurn } from './test-harness.js';

const EMPTY_PLAN_HASH = planHash(emptyPlan());

describe('escalation decision helpers (docs/07, 6.5)', () => {
  it('maps resolution sources and origins deterministically', () => {
    expect(resolvedByOf('timeout')).toBe('default');
    expect(resolvedByOf('class_decision')).toBe('class');
    expect(resolvedByOf('external')).toBe('live');
    expect(decisionOriginOf('default')).toBe('escalation-default');
    expect(decisionOriginOf('class')).toBe('escalation-class');
    expect(decisionOriginOf('revision-transform')).toBe('escalation-live');
    expect(escalationDecisionKey(7)).toBe(escalationDecisionKey(7));
    expect(escalationDecisionKey(7)).not.toBe(escalationDecisionKey(8));
  });
});

function escalationDecisionsOf(entries: readonly JournalEntry[]): Array<Record<string, unknown>> {
  return entries
    .filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'escalation-decision',
    )
    .map((entry) => entry.value as Record<string, unknown>);
}

function nodeStatusesOf(entries: readonly JournalEntry[]): Record<string, string> {
  const statuses: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.kind !== 'plan.decision') {
      continue;
    }
    const ops =
      (
        entry.value as {
          ops?: Array<{ kind: string; nodeId?: string; to?: string; decision?: { kind?: string } }>;
        }
      ).ops ?? [];
    for (const op of ops) {
      if (op.kind === 'set_node_status' && op.nodeId !== undefined && op.to !== undefined) {
        statuses[op.nodeId] = op.to;
      }
      if (op.kind === 'resolve_escalation' && op.nodeId !== undefined) {
        // The fate is applied by the fold (docs/07, 3.3): mirror it.
        const fate = { accept: 'done', cancel: 'cancelled', retry: 'pending' }[
          op.decision?.kind ?? ''
        ];
        if (fate !== undefined) {
          statuses[op.nodeId] = fate;
        }
      }
    }
  }
  return statuses;
}

const ESCALATE_ARGS = {
  kind: 'scope_bigger',
  scopeDelta: 'the task needs the whole subsystem',
  revisedEstimate: { usd: 2, turns: 8 },
};

function escalatedTarget(
  req: ChatRequest,
): { nodeId: string; base: { digestSeq: number; planHash: string } } | undefined {
  const digest = lastToolResult<{
    digestSeq: number;
    planHash?: string;
    escalations?: Array<{ nodeId: string }>;
  }>(req, (value) => typeof (value as { digestSeq?: unknown } | undefined)?.digestSeq === 'number');
  const nodeId = digest?.escalations?.[0]?.nodeId;
  if (digest?.planHash === undefined || nodeId === undefined) {
    return undefined;
  }
  return { nodeId, base: { digestSeq: digest.digestSeq, planHash: digest.planHash } };
}

function orchestratorPhases(
  turns: (phase: number, req: ChatRequest) => ScriptedTurn | undefined,
): (req: ChatRequest) => ScriptedTurn | undefined {
  let phase = 0;
  return (req) => {
    if (agentTypeOf(req) !== '') {
      return undefined;
    }
    phase += 1;
    return turns(phase, req);
  };
}

describe('EscalationProtocol completion (M7-T11)', () => {
  it('resolves a Flavor A report through the cancel_task transform with the counting debit', async () => {
    const orchestrator = orchestratorPhases((phase, req) => {
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
              rationale: 'one worker',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'escalation' }] } },
        };
      }
      if (phase === 3) {
        // The digest carries the escalation; cancel the escalated node.
        const target = escalatedTarget(req);
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: target?.base ?? { digestSeq: 1, planHash: 'MISSING' },
              ops: [{ op: 'cancel_task', nodeId: target?.nodeId ?? 'MISSING', reason: 'too big' }],
              rationale: 'cancel the escalated node',
            },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'closed' } } };
    });
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w', escalation: { flavor: 'A' } } },
      },
    });
    const handle = orchestratePlanned(engine, 'escalation A', {});
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    // The terminal escalated entry carries the runtime-completed report.
    const terminal = entries.find(
      (entry) => entry.kind === 'agent' && entry.status === 'escalated',
    );
    expect(terminal).toBeDefined();
    expect((terminal?.escalation as { kind?: string } | undefined)?.kind).toBe('scope_bigger');

    const decisions = escalationDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    const decision = decisions[0] as {
      decision: { kind: string };
      countsAgainstLimit: boolean;
      escalationUnitsAfter: number;
      resolvedBy: string;
      reportRef: number;
    };
    expect(decision.decision.kind).toBe('cancel');
    // scope_bigger counts (XF-06): E0 default 2, one debit leaves 1.
    expect(decision.countsAgainstLimit).toBe(true);
    expect(decision.escalationUnitsAfter).toBe(1);
    expect(decision.resolvedBy).toBe('revision-transform');
    expect(decision.reportRef).toBe(terminal?.seq);

    // The fate landed: escalated -> cancelled, plus the severing abandon.
    expect(Object.values(nodeStatusesOf(entries))).toContain('cancelled');
    expect(entries.some((entry) => entry.kind === 'abandon')).toBe(true);
  });

  it('applies the timeout defaultDecision to a Flavor B suspension (accept closes done)', async () => {
    const orchestrator = orchestratorPhases((phase) => {
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
              rationale: 'one worker',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'done' } } };
    });
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          worker: {
            description: 'w',
            escalation: { flavor: 'B', deadlineMs: 25, defaultDecision: { kind: 'accept' } },
          },
        },
      },
    });
    const handle = orchestratePlanned(engine, 'escalation B timeout', {});
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    // The suspension closed by the timeout resolution (DEF-4).
    const suspended = entries.find(
      (entry) =>
        entry.kind === 'approval' &&
        (entry.value as { toolName?: string } | undefined)?.toolName === 'escalate',
    );
    expect(suspended).toBeDefined();
    const resolution = entries.find(
      (entry) => entry.kind === 'resolution' && entry.ref === suspended?.seq,
    );
    // The DEF-4 payload rides the entry's resolution field (docs/03, 8.6).
    expect((resolution?.resolution as { by?: string } | undefined)?.by).toBe('timeout');

    const decisions = escalationDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    expect((decisions[0] as { resolvedBy?: string }).resolvedBy).toBe('default');
    expect((decisions[0] as { decision?: { kind?: string } }).decision?.kind).toBe('accept');
    // accept closes the paid partial result as done (docs/07, 3.3).
    expect(Object.values(nodeStatusesOf(entries))).toContain('done');
  });

  it('decomposes through the timeout default with admitted children and spawn debits', async () => {
    const orchestrator = orchestratorPhases((phase) => {
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'the big one' } }],
              rationale: 'one worker',
            },
          },
        };
      }
      if (phase === 2 || phase === 3) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'quiescence' }] } },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'decomposed' } } };
    });
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      const prompt = JSON.stringify(req.messages);
      if (prompt.includes('half A') || prompt.includes('half B')) {
        return { text: 'small piece done' };
      }
      return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: {
          worker: {
            description: 'w',
            escalation: {
              flavor: 'B',
              deadlineMs: 25,
              defaultDecision: {
                kind: 'decompose',
                children: [
                  { agentType: 'worker', prompt: 'half A' },
                  { agentType: 'worker', prompt: 'half B' },
                ],
              },
            },
          },
        },
      },
    });
    const handle = orchestratePlanned(engine, 'escalation B decompose', {});
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const decisions = escalationDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    const decision = decisions[0] as {
      decision: { kind: string };
      admissions?: Array<{ decision?: { verdict?: { spawnUnitsAfter?: number } } }>;
    };
    expect(decision.decision.kind).toBe('decompose');
    // Two admitted children debit spawn units through the decision entry
    // (128 - add_task - 2 children = 125 after the second).
    expect(decision.admissions).toHaveLength(2);
    expect(decision.admissions?.[1]?.decision?.verdict?.spawnUnitsAfter).toBe(125);

    const statuses = nodeStatusesOf(entries);
    // Both decomposition children ran to done; the escalated node stays
    // escalated while its children carry the work (docs/07, 3.3).
    expect(Object.values(statuses).filter((status) => status === 'done')).toHaveLength(2);
    const halves = adapter.calls.filter((req) => /half [AB]/.test(JSON.stringify(req.messages)));
    expect(halves.length).toBeGreaterThanOrEqual(2);
  });

  it('flags capExceeded when the counting debit is denied', async () => {
    const orchestrator = orchestratorPhases((phase, req) => {
      if (phase === 1) {
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: { digestSeq: 0, planHash: EMPTY_PLAN_HASH },
              ops: [{ op: 'add_task', spec: { agentType: 'worker', prompt: 'do it' } }],
              rationale: 'one worker',
            },
          },
        };
      }
      if (phase === 2) {
        return {
          toolCall: { name: 'wait_for_events', args: { triggers: [{ kind: 'escalation' }] } },
        };
      }
      if (phase === 3) {
        const target = escalatedTarget(req);
        return {
          toolCall: {
            name: 'plan_revise',
            args: {
              base: target?.base ?? { digestSeq: 1, planHash: 'MISSING' },
              ops: [{ op: 'cancel_task', nodeId: target?.nodeId ?? 'MISSING' }],
              rationale: 'cap play',
            },
          },
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'capped' } } };
    });
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      const scripted = orchestrator(req);
      if (scripted !== undefined) {
        return scripted;
      }
      return { toolCall: { name: 'escalate', args: ESCALATE_ARGS } };
    });
    const store = new InMemoryStore();
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: store },
      defaults: {
        routing: { loop: 'fake:model', orchestrate: 'fake:model' },
        profiles: { worker: { description: 'w', escalation: { flavor: 'A' } } },
      },
    });
    const handle = orchestratePlanned(engine, 'cap exceeded', {
      plan: { limits: { maxEscalationsPerLogicalTask: 0 } },
    });
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');

    const entries = await store.load(handle.runId);
    const denied = entries.find(
      (entry) =>
        entry.kind === 'termination.denied' &&
        (entry.value as { resource?: string } | undefined)?.resource === 'escalationUnits',
    );
    expect(denied).toBeDefined();
    const decisions = escalationDecisionsOf(entries);
    expect(decisions).toHaveLength(1);
    const decision = decisions[0] as {
      capExceeded?: boolean;
      countsAgainstLimit: boolean;
      seq?: number;
    };
    // The denied entry precedes; the decision resolves the fate flagged,
    // never a bare limit (docs/07, 6.5) and the folds stay replay-strict.
    expect(decision.capExceeded).toBe(true);
    expect(decision.countsAgainstLimit).toBe(false);
    const decisionSeq = entries.find(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'escalation-decision',
    )?.seq;
    expect(denied?.seq).toBeLessThan(decisionSeq ?? -1);
    expect(Object.values(nodeStatusesOf(entries))).toContain('cancelled');
  });
});
