/**
 * The RV-217 gate at the engine surface: "PII never persists or emits
 * in plaintext under policy". Envelope encryption over real files
 * (grep the raw bytes), resume through the hook with zero adapter
 * calls, portable export/import through the policy point, host
 * redaction patterns at the event boundary, the salted args digest,
 * and the audit-trail reducer. Reproduced on published 1.57.0 before
 * the fix: 6 plaintext PII occurrences in raw sqlite bytes, a masker
 * that passes PII verbatim, and none of these APIs existing.
 */
import { mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createEnvelopeEncryption, localKeyProvider } from '../l0/encryption.js';
import { InMemoryStore, InMemoryTranscriptStore } from '../stores/inmemory.js';
import { JsonlFileStore, FileTranscriptStore } from '../stores/jsonl.js';
import { ConfigError } from '../l0/errors.js';
import type { WorkflowEvent } from '../l0/events.js';
import { tool } from '../tools/tool.js';
import { reduceAuditTrail } from './audit.js';
import { createEngine, hashRunArgs } from './engine.js';
import { defineWorkflow } from './ctx.js';
import { scriptedAdapter } from './test-harness.js';

const SECRET = 'the-deployment-master-secret';
const PII = 'ivan.petrov+medical@example.com';

const lookupTool = () =>
  tool({
    name: 'lookup_patient',
    description: 'looks up a patient record',
    parameters: { type: 'object', properties: {} },
    execute: () => Promise.resolve({ email: PII, diagnosis: 'confidential' }),
  });

const piiWf = defineWorkflow({ name: 'pii-run' }, async (ctx) => {
  const answer = await ctx.agent(`process the record for ${PII}`, { tools: [lookupTool()] });
  return { answer };
});

const piiAdapter = () =>
  scriptedAdapter((req, call) =>
    call === 0 ? { toolCall: { name: 'lookup_patient', args: {} } } : { text: `done for ${PII}` },
  );

/** Every file under dir, recursively. */
function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...filesUnder(path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function grepCount(dir: string, needle: string): number {
  let hits = 0;
  for (const path of filesUnder(dir)) {
    hits += readFileSync(path, 'latin1').split(needle).length - 1;
  }
  return hits;
}

describe('the persistence gate: PII never persists in plaintext under the hook', () => {
  it('a run over real files leaves ZERO greppable PII, and resumes through the hook with zero adapter calls', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-dp-'));
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const makeEngine = (adapter = piiAdapter()) => ({
      adapter,
      engine: createEngine({
        adapters: [adapter],
        stores: {
          journal: new JsonlFileStore({ dir }),
          transcripts: new FileTranscriptStore({ dir: join(dir, 'blobs') }),
        },
        serialization: enc.hook,
        defaults: { routing: { loop: 'fake:model' } },
      }),
    });
    const first = makeEngine();
    const outcome = await first.engine.run(piiWf, undefined, { runId: 'DP1' }).result;
    expect(outcome.status).toBe('ok');
    expect((outcome.value as { answer: string }).answer).toBe(`done for ${PII}`);
    expect(first.adapter.calls.length).toBe(2);

    // THE GATE: the same grep that found 6 plaintext occurrences on
    // published 1.57.0 now finds ZERO across every persisted byte
    // (journal lines AND transcript blobs, checkpoints included).
    expect(grepCount(dir, PII)).toBe(0);

    // Engine.stores reads plaintext through the one policy point.
    const loaded = await first.engine.stores.journal.load('DP1');
    expect(JSON.stringify(loaded)).toContain(PII);

    // A second engine (a second process) resumes through the hook:
    // identical outcome, zero live calls.
    const second = makeEngine();
    const resumed = await second.engine.resume('DP1', piiWf).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toEqual(outcome.value);
    expect(second.adapter.calls.length).toBe(0);
  });
});

describe('portable export and import through the policy point', () => {
  it('exports decrypted, imports re-encrypted, and refuses an existing run', async () => {
    const enc = await createEnvelopeEncryption({ provider: localKeyProvider({ secret: SECRET }) });
    const sourceStores = {
      journal: new InMemoryStore({ quiet: true }),
      transcripts: new InMemoryTranscriptStore(),
    };
    const source = createEngine({
      adapters: [piiAdapter()],
      stores: sourceStores,
      serialization: enc.hook,
      defaults: { routing: { loop: 'fake:model' } },
    });
    const outcome = await source.run(piiWf, undefined, { runId: 'DP2' }).result;
    expect(outcome.status).toBe('ok');

    // The bundle is PLAINTEXT (a subject-access request reads it).
    const bundle = await source.exportRun('DP2');
    expect(bundle.runId).toBe('DP2');
    expect(bundle.meta?.status).toBe('ok');
    expect(JSON.stringify(bundle.entries)).toContain(PII);
    expect(bundle.blobs.length).toBeGreaterThan(0);

    // Import into a DIFFERENTLY-keyed engine: raw target bytes are
    // enveloped under the target's policy, and the run resumes there.
    const targetKeys = await createEnvelopeEncryption({
      provider: localKeyProvider({ secret: 'another-deployment-secret' }),
    });
    const targetInner = {
      journal: new InMemoryStore({ quiet: true }),
      transcripts: new InMemoryTranscriptStore(),
    };
    const targetAdapter = piiAdapter();
    const target = createEngine({
      adapters: [targetAdapter],
      stores: targetInner,
      serialization: targetKeys.hook,
      defaults: { routing: { loop: 'fake:model' } },
    });
    await target.importRun(bundle);
    const rawEntries = await targetInner.journal.load('DP2');
    expect(JSON.stringify(rawEntries)).not.toContain(PII);
    const resumed = await target.resume('DP2', piiWf).result;
    expect(resumed.status).toBe('ok');
    expect(resumed.value).toEqual(outcome.value);
    expect(targetAdapter.calls.length).toBe(0);

    // Importing over an existing run refuses typed.
    await expect(target.importRun(bundle)).rejects.toThrow(/already exists/);
    await expect(source.exportRun('NOPE')).rejects.toThrow(/does not exist/);
    await expect(target.importRun({ runId: '' } as never)).rejects.toThrow(ConfigError);
  });
});

describe('the emission gate: host redaction patterns at the event boundary', () => {
  it('redaction.patterns masks host PII in every emitted event; an invalid pattern fails typed', async () => {
    const adapter = scriptedAdapter(() => ({ text: `contact ${PII} tomorrow` }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      redaction: { patterns: [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/] },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'chatty' }, async (ctx) => {
      ctx.log('info', `reaching out to ${PII}`);
      return ctx.agent('summarize the contact');
    });
    const handle = engine.run(wf, undefined);
    const seen: WorkflowEvent[] = [];
    void (async () => {
      for await (const event of handle.events) {
        seen.push(event);
      }
    })();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    const streamed = JSON.stringify(seen);
    expect(streamed).not.toContain(PII);
    expect(streamed).toContain('[masked-secret]');

    expect(() =>
      createEngine({
        adapters: [],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        redaction: { patterns: ['('] },
      }),
    ).toThrow(ConfigError);
  });
});

describe('the salted args digest', () => {
  it('security.argsHashSalt breaks cross-deployment correlation and stays deterministic within one', async () => {
    const args = { patient: PII, approved: true };
    const run = async (salt?: string) => {
      const store = new InMemoryStore({ quiet: true });
      const engine = createEngine({
        adapters: [scriptedAdapter(() => ({ text: 'ok' }))],
        stores: { journal: store },
        ...(salt === undefined ? {} : { security: { argsHashSalt: salt } }),
        defaults: { routing: { loop: 'fake:model' } },
      });
      const wf = defineWorkflow({ name: 'salted' }, (ctx) => ctx.agent('go'));
      const handle = engine.run(wf, args);
      await handle.result;
      const meta = await store.getMeta(handle.runId);
      return meta?.argsHash;
    };
    const unsalted = await run();
    const saltedA = await run('deployment-salt');
    const saltedARepeat = await run('deployment-salt');
    const saltedB = await run('other-salt');
    expect(unsalted).toBe(hashRunArgs(args));
    expect(saltedA).toBe(hashRunArgs(args, { salt: 'deployment-salt' }));
    expect(saltedA).toBe(saltedARepeat);
    expect(saltedA).not.toBe(unsalted);
    expect(saltedA).not.toBe(saltedB);
    expect(() =>
      createEngine({
        adapters: [],
        stores: { journal: new InMemoryStore({ quiet: true }) },
        security: { argsHashSalt: '' },
      }),
    ).toThrow(ConfigError);
  });
});

describe('the audit trail reducer', () => {
  it('folds suspensions, resolutions, decisions, and the settle into a reviewable trail', async () => {
    const store = new InMemoryStore({ quiet: true });
    const engine = createEngine({
      adapters: [scriptedAdapter(() => ({ text: 'analyzed' }))],
      stores: { journal: store },
      defaults: { routing: { loop: 'fake:model' } },
    });
    const wf = defineWorkflow({ name: 'gated' }, async (ctx) => {
      const analysis = await ctx.agent('analyze');
      const gate = await ctx.awaitExternal<{ approved: boolean }>('sign-off', {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['approved'],
          properties: { approved: { type: 'boolean' } },
        },
      });
      return { analysis, approved: gate.approved };
    });
    const handle = engine.run(wf, undefined, { runId: 'AUDIT1' });
    const first = await handle.result;
    expect(first.status).toBe('suspended');
    await handle.resolveExternal('sign-off', { approved: true });
    const outcome = await engine.resume('AUDIT1', wf).result;
    expect(outcome.status).toBe('ok');

    const trail = reduceAuditTrail(await store.load('AUDIT1'));
    const categories = trail.map((r) => r.category);
    expect(categories).toContain('suspension');
    expect(categories).toContain('resolution');
    expect(categories).toContain('run-settle');
    const suspension = trail.find((r) => r.category === 'suspension');
    expect(suspension?.type).toBe('external');
    const resolution = trail.find((r) => r.category === 'resolution');
    expect(resolution?.target).toBe(suspension?.seq);
    expect(resolution?.value).toEqual({ approved: true });
    // Both segments settled (the first as 'suspended'); the LAST word
    // is the run's terminal status.
    const settles = trail.filter((r) => r.category === 'run-settle');
    expect(settles.length).toBeGreaterThanOrEqual(2);
    expect(settles[settles.length - 1]?.summary).toBe('run settled ok');
    // Ordered by seq, exactly like the journal.
    expect(trail.map((r) => r.seq)).toEqual([...trail.map((r) => r.seq)].sort((a, b) => a - b));
  });
});
