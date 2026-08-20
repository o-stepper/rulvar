/**
 * The candidate persistence policy and the closed lineage surface
 * (RV4207, the sixth comparison experiment). The experiment's rejected
 * composition EXISTED, byte for byte, in a transcript blob, and its
 * hash verified against the journal by a recipe the auditor had to
 * re-derive from source; the finding was never "the bytes are gone"
 * but "there is no typed surface and no documented recipe". These
 * tests pin the surface: the declared policy stamps every verdict with
 * the candidate identity (the accepted one included), names WHY bytes
 * are absent instead of leaving a mystery, and the exported recipe
 * verifies retained bytes against the journal.
 */
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { executeWorkflow } from '../engine/ctx.js';
import { makeInternals, scriptedAdapter, type ScriptedTurn } from '../engine/test-harness.js';
import {
  candidateHashOf,
  synthesisCandidatesFromJournal,
  verifyCandidateBytes,
} from '../stores/synthesis-candidates.js';
import { makeOrchestratorWorkflow } from './orchestrate.js';

const PROFILES = { worker: { description: 'reads one span' } };

function agentTypeOf(req: ChatRequest): string {
  const rulvar = (req.providerOptions as { rulvar?: { agentType?: string } } | undefined)?.rulvar;
  return rulvar?.agentType ?? '';
}

function handlesIn(req: ChatRequest): number[] {
  const handles: number[] = [];
  for (const msg of req.messages) {
    for (const part of msg.parts) {
      if (part.type === 'tool-result') {
        const result = part.result as { handle?: number };
        if (typeof result?.handle === 'number') {
          handles.push(result.handle);
        }
      }
    }
  }
  return handles;
}

/** One worker, one draft, a synthesis that misses the marker once. */
function harness() {
  let orchTurn = 0;
  const coordination = scriptedAdapter((req): ScriptedTurn => {
    if (agentTypeOf(req) === 'worker') {
      return { text: 'the recorded reading' };
    }
    orchTurn += 1;
    if (orchTurn === 1) {
      return {
        toolCall: { name: 'spawn_agent', args: { agentType: 'worker', prompt: 'read the span' } },
      };
    }
    if (orchTurn === 2) {
      return { toolCall: { name: 'await_all', args: { handles: handlesIn(req) } } };
    }
    return { toolCall: { name: 'finish', args: { result: 'draft before synthesis' } } };
  });
  let synthesisTurn = 0;
  const synthesis = scriptedAdapter(
    (): ScriptedTurn => {
      synthesisTurn += 1;
      return synthesisTurn === 1
        ? { toolCall: { name: 'finish', args: { result: 'missing the marker' } } }
        : { toolCall: { name: 'finish', args: { result: 'final with MARKER intact' } } };
    },
    { id: 'strong' },
  );
  return {
    ...makeInternals({
      adapters: [coordination, synthesis],
      routing: { loop: 'fake:model', orchestrate: 'fake:model', synthesize: 'strong:model' },
      profiles: PROFILES,
    }),
  };
}

const MARKER_VALIDATION = {
  validators: [
    {
      name: 'wants-marker',
      validate: (input: { text: string }) =>
        input.text.includes('MARKER')
          ? { ok: true as const }
          : { ok: false as const, reasons: ['no MARKER'] },
    },
  ],
  maxRepairs: 1,
};

const finishVerdicts = (
  entries: readonly { kind: string; value?: unknown }[],
): Record<string, unknown>[] =>
  entries
    .filter(
      (entry) =>
        entry.kind === 'decision' &&
        (entry.value as { decisionType?: string } | undefined)?.decisionType ===
          'orchestrator_finish_validation',
    )
    .map((entry) => entry.value as Record<string, unknown>);

describe('candidatePersistence intake (RV4207)', () => {
  it('refuses garbage literals and a double declaration', () => {
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        finishValidation: { ...MARKER_VALIDATION, candidatePersistence: 'artifact' as never },
      }),
    ).toThrow(/candidatePersistence must be 'transcript' or 'hash-only'/);
    expect(() =>
      makeOrchestratorWorkflow('g', {
        synthesis: {},
        finishValidation: {
          ...MARKER_VALIDATION,
          candidatePersistence: 'transcript',
          retainRejectedCandidates: true,
        },
      }),
    ).toThrow(/supersedes retainRejectedCandidates: declare one, not both/);
  });
});

describe('the declared policy closes the chain (RV4207)', () => {
  it("'hash-only' stamps every verdict's identity and names why bytes are absent", async () => {
    const { internals, store } = harness();
    const outcome = await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        synthesis: {},
        finishValidation: { ...MARKER_VALIDATION, candidatePersistence: 'hash-only' },
      }),
      undefined,
    );
    expect(outcome).toBe('final with MARKER intact');
    const verdicts = finishVerdicts(await store.load('test-run'));
    expect(verdicts.map((verdict) => verdict.verdict)).toEqual(['repair', 'accepted']);
    const [repair, accepted] = verdicts;
    // The rejected candidate: identity, the declared reason, no blob.
    expect(repair?.candidateHash).toBe(candidateHashOf('missing the marker'));
    expect(repair?.candidateChars).toBe('missing the marker'.length);
    expect(repair?.bytesUnavailableReason).toBe('hash-only-persistence');
    expect(repair?.candidateRef).toBeUndefined();
    // The ACCEPTED candidate carries its identity too: the chain
    // closes on the same recipe the semantic judges bind.
    expect(accepted?.candidateHash).toBe(candidateHashOf('final with MARKER intact'));
    expect(accepted?.candidateChars).toBe('final with MARKER intact'.length);
    expect(accepted?.bytesUnavailableReason).toBeUndefined();
    // The fold surfaces the reason beside the identity.
    const chain = synthesisCandidatesFromJournal(await store.load('test-run'));
    expect(chain.candidates.map((candidate) => candidate.verdict)).toEqual(['repair', 'accepted']);
    expect(chain.candidates[0]?.bytesUnavailableReason).toBe('hash-only-persistence');
    expect(chain.candidates[1]?.candidateHash).toBe(candidateHashOf('final with MARKER intact'));
  });

  it("'transcript' retains the rejected bytes and the blob verifies against the journal", async () => {
    const { internals, store } = harness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        synthesis: {},
        finishValidation: { ...MARKER_VALIDATION, candidatePersistence: 'transcript' },
      }),
      undefined,
    );
    const verdicts = finishVerdicts(await store.load('test-run'));
    const repair = verdicts[0];
    expect(repair?.candidateRef).toBeDefined();
    expect(repair?.bytesUnavailableReason).toBeUndefined();
    const blob = await internals.transcripts.get(repair?.candidateRef as string);
    expect(blob).not.toBeNull();
    if (blob === null) {
      return;
    }
    // The audit predicate: retained bytes against the journaled hash.
    expect(verifyCandidateBytes(blob, repair?.candidateHash as string)).toBe(true);
    expect(verifyCandidateBytes(blob, candidateHashOf('some other document'))).toBe(false);
  });

  it('undeclared configs keep their decision bytes: no identity on the accepted verdict', async () => {
    const { internals, store } = harness();
    await executeWorkflow(
      internals,
      makeOrchestratorWorkflow('goal', {
        synthesis: {},
        finishValidation: { ...MARKER_VALIDATION },
      }),
      undefined,
    );
    const verdicts = finishVerdicts(await store.load('test-run'));
    const [repair, accepted] = verdicts;
    // RV2507 exactly: identity on the non-accepted verdict only, no
    // reason field anywhere.
    expect(repair?.candidateHash).toBe(candidateHashOf('missing the marker'));
    expect(repair?.bytesUnavailableReason).toBeUndefined();
    expect(accepted?.candidateHash).toBeUndefined();
    expect(accepted?.candidateChars).toBeUndefined();
  });
});

describe('the hash recipe is exported and verifiable (RV4207)', () => {
  it('hashes the canonical VALUE: a string document as its JSON encoding', () => {
    // The recipe fact the experiment's auditor had to re-derive: the
    // hash covers jcsSerialize(value), so a raw-text sha256 of the
    // same document does NOT match, and a trailing newline changes a
    // FILE's sha while this hash holds.
    const document = 'the accepted composition';
    expect(candidateHashOf(document)).toMatch(/^[0-9a-f]{64}$/u);
    expect(verifyCandidateBytes(document, candidateHashOf(document))).toBe(true);
    expect(verifyCandidateBytes(`${document}\n`, candidateHashOf(document))).toBe(false);
    // A structured candidate round-trips through its JSON text, the
    // form the transcript blob holds for non-string results.
    const structured = { sections: ['a', 'b'], done: true };
    expect(verifyCandidateBytes(JSON.stringify(structured), candidateHashOf(structured))).toBe(
      true,
    );
    // Unparsable garbage is a false, never a throw.
    expect(verifyCandidateBytes('{not json', candidateHashOf(structured))).toBe(false);
    // An absent candidate hashes as null, the journal's own recipe.
    expect(candidateHashOf(undefined)).toBe(candidateHashOf(null));
  });
});
