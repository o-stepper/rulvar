/**
 * Adapter-declared usage-semantics stamping and the legacy v1.19.0
 * cache-journal advisory (v1.20.0 review P1/P2-2). The stamp is policy,
 * never identity: adapters that declare nothing produce byte-identical
 * journals, and unstamped historical entries fold exactly as before.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import type { Usage } from '../l0/messages.js';
import { JsonlFileStore } from '../stores/jsonl.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { scriptedAdapter, testCaps } from './test-harness.js';

const WRITE_USAGE: Usage = {
  inputTokens: 1000,
  outputTokens: 5,
  cacheReadTokens: 0,
  cacheWriteTokens: 400,
};

const wf = defineWorkflow({ name: 'sem' }, (ctx) => ctx.agent('go'));

function openaiLikeEngine(store: JsonlFileStore, options?: { semantics?: string; usage?: Usage }) {
  const adapter = scriptedAdapter(() => ({ text: 'done', usage: options?.usage ?? WRITE_USAGE }), {
    id: 'openai',
    caps: testCaps(),
  });
  if (options?.semantics !== undefined) {
    adapter.usageSemantics = options.semantics;
  }
  const engine = createEngine({
    adapters: [adapter],
    stores: { journal: store },
    defaults: { routing: { loop: 'openai:model' } },
  });
  return { engine, adapter };
}

function captureWarnings(): { codes: string[]; restore: () => void } {
  const codes: string[] = [];
  const spy = vi
    .spyOn(process, 'emitWarning')
    .mockImplementation((warning: string | Error, opts?: { code?: string }) => {
      codes.push(typeof opts?.code === 'string' ? opts.code : String(warning));
    });
  return { codes, restore: () => spy.mockRestore() };
}

describe('usage-semantics stamping', () => {
  it('stamps the serving adapter declaration on the terminal entry', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-sem-')) });
    const { engine } = openaiLikeEngine(store, { semantics: 'openai-cache-subsets-v2' });
    const outcome = await engine.run(wf, undefined, { runId: 'SEM1' }).result;
    expect(outcome.status).toBe('ok');
    const entries = await store.load('SEM1');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(terminal?.usageSemantics).toBe('openai-cache-subsets-v2');
  });

  it('writes NO stamp when the adapter declares none, keeping journals byte-identical', async () => {
    const store = new JsonlFileStore({ dir: mkdtempSync(join(tmpdir(), 'rulvar-sem-')) });
    const { engine } = openaiLikeEngine(store);
    await engine.run(wf, undefined, { runId: 'SEM2' }).result;
    const entries = await store.load('SEM2');
    const terminal = entries.find((e) => e.kind === 'agent' && e.status === 'ok');
    expect(terminal).toBeDefined();
    expect('usageSemantics' in (terminal ?? {})).toBe(false);
  });
});

describe('legacy v1.19.0 cache-journal advisory on resume', () => {
  it('warns once for unstamped openai entries carrying cache writes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sem-'));
    await openaiLikeEngine(new JsonlFileStore({ dir })).engine.run(wf, undefined, { runId: 'LEG1' })
      .result;

    const { codes, restore } = captureWarnings();
    try {
      const second = openaiLikeEngine(new JsonlFileStore({ dir }));
      const outcome = await second.engine.resume('LEG1', wf).result;
      expect(outcome.status).toBe('ok');
      // Pure replay: nothing re-paid, but the advisory fired.
      expect(second.adapter.calls).toHaveLength(0);
      expect(codes).toContain('RULVAR_LEGACY_CACHE_SEMANTICS');
    } finally {
      restore();
    }
  });

  it('a frozen v1.19-shaped journal file warns AND still replays byte-identically', async () => {
    // The fixture freezes the exact v1.19.0 persisted shape: the write
    // leg's inputTokens carry the double-counted writes. Editing the
    // usage in place is safe precisely because usage is policy, never
    // identity; the replay must still hit.
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sem-'));
    await openaiLikeEngine(new JsonlFileStore({ dir })).engine.run(wf, undefined, {
      runId: 'FROZEN1',
    }).result;
    const file = join(dir, 'FROZEN1.jsonl');
    const rewritten = readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => {
        if (line === '') {
          return line;
        }
        const entry = JSON.parse(line) as {
          usage?: { inputTokens: number; cacheWriteTokens: number };
        };
        if (entry.usage !== undefined && entry.usage.cacheWriteTokens > 0) {
          // The v1.19.0 inflation: writes were ADDED onto the full input.
          entry.usage.inputTokens += entry.usage.cacheWriteTokens;
        }
        return JSON.stringify(entry);
      })
      .join('\n');
    writeFileSync(file, rewritten);

    const { codes, restore } = captureWarnings();
    try {
      const second = openaiLikeEngine(new JsonlFileStore({ dir }));
      const outcome = await second.engine.resume('FROZEN1', wf).result;
      expect(outcome.status).toBe('ok');
      expect(second.adapter.calls).toHaveLength(0);
      expect(codes).toContain('RULVAR_LEGACY_CACHE_SEMANTICS');
      // The fold reports the inflated numbers as recorded, never a
      // silent recalculation.
      expect(outcome.usage.inputTokens).toBe(1400);
    } finally {
      restore();
    }
  });

  it('stays silent for stamped entries and for unstamped entries without writes', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rulvar-sem-'));
    const stampedStore = new JsonlFileStore({ dir });
    await openaiLikeEngine(stampedStore, { semantics: 'openai-cache-subsets-v2' }).engine.run(
      wf,
      undefined,
      { runId: 'LEG2' },
    ).result;
    const noWrites: Usage = { ...WRITE_USAGE, cacheWriteTokens: 0 };
    await openaiLikeEngine(stampedStore, { usage: noWrites }).engine.run(wf, undefined, {
      runId: 'LEG3',
    }).result;

    const { codes, restore } = captureWarnings();
    try {
      const again = () => openaiLikeEngine(new JsonlFileStore({ dir }));
      await again().engine.resume('LEG2', wf).result;
      await again().engine.resume('LEG3', wf).result;
      expect(codes).not.toContain('RULVAR_LEGACY_CACHE_SEMANTICS');
    } finally {
      restore();
    }
  });
});
