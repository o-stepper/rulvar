/**
 * The taskClass binding interim rule (M10-T05; docs/05, section
 * "Phases and placement"; docs/14, OQ-12): author-declared, optional,
 * absent means unclassified. Phase 1 applies NO card recommendations
 * to any spawn (the verified layer is empty), so the rule's teeth here
 * are the SUBSTRATE: a declared class journals inside the
 * spawn-admission decision; an undeclared spawn journals none.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import type { JournalEntry } from '../l0/entries.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

describe('taskClass binding, phase 1 (M10-T05; OQ-12)', () => {
  it('journals a declared class in the admission and none when unclassified', async () => {
    let orchTurn = 0;
    const adapter = scriptedAdapter((req): ScriptedTurn => {
      if (agentTypeOf(req) === 'worker') {
        return { text: 'done' };
      }
      orchTurn += 1;
      if (orchTurn === 1) {
        return {
          toolCalls: [
            {
              name: 'spawn_agent',
              args: { agentType: 'worker', prompt: 'classified', taskClass: 'code-edit' },
            },
            { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'unclassified' } },
          ],
        };
      }
      return { toolCall: { name: 'finish', args: { result: 'ok' } } };
    });
    const { internals, store } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model', orchestrate: 'fake:model' },
      profiles: { worker: { description: 'w' } },
    });
    await executeWorkflow(internals, makeOrchestratorWorkflow('classes', {}), undefined);
    const entries = await store.load('test-run');
    const admissions = entries.filter(
      (entry: JournalEntry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType === 'spawn-admission',
    );
    expect(admissions).toHaveLength(2);
    const specs = admissions.map(
      (entry) => (entry.value as { spec: { prompt: string; taskClass?: string } }).spec,
    );
    const classified = specs.find((spec) => spec.prompt === 'classified');
    const unclassified = specs.find((spec) => spec.prompt === 'unclassified');
    expect(classified?.taskClass).toBe('code-edit');
    // Absence IS unclassified: no literal string is ever stored.
    expect(unclassified).toBeDefined();
    expect('taskClass' in (unclassified ?? {})).toBe(false);
  });
});
