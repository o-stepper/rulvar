/**
 * The read-only pilot preset (RV1606): the production-profiles guide's
 * controlled-pilot posture as one shipped factory. The eighteenth
 * comparison benchmark's improvement plan asked for a deliverable
 * profile whose refusals are typed and pre-effect: every risk class
 * outside declared reads denies at the permission chain, a drifted
 * toolset refuses at spawn through the pinned attestation, and the
 * happy read-only path still researches and finishes.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ChatRequest } from '../l0/messages.js';
import { ConfigError } from '../l0/errors.js';
import { InMemoryStore } from '../stores/inmemory.js';
import { compilePermissionChain, evaluatePermission } from '../runtime/permission-chain.js';
import { tool } from '../tools/tool.js';
import { defineWorkflow } from './ctx.js';
import { createEngine } from './engine.js';
import { pilotAgentProfile } from './profile-templates.js';
import { scriptedAdapter, type ScriptedTurn } from './test-harness.js';

function repoDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rulvar-pilot-'));
  writeFileSync(join(dir, 'README.md'), 'the pilot reads this line\n');
  return dir;
}

describe('pilotAgentProfile (RV1606)', () => {
  it('pins the resolved toolset and arms the fail-closed permission posture', async () => {
    const pilot = await pilotAgentProfile({ root: repoDir() });
    expect(pilot.attestation.hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(pilot.profile.toolsetAttestation).toBe(pilot.attestation);
    expect(pilot.profile.isolation).toBe('none');
    expect(pilot.profile.permissions).toEqual({
      deny: [{ risk: ['write', 'network', 'execute', 'destructive', 'undeclared'] }],
      strictApprovals: true,
      inheritPermissions: false,
    });
    // The per-tool pins cover the whole read-only kit.
    expect(Object.keys(pilot.attestation.tools ?? {}).sort()).toEqual([
      'list_evidence',
      'list_files',
      'read_file',
      'record_evidence',
      'report_progress',
      'search_files',
    ]);
  });

  it('denies every risk class outside declared reads, typed at the chain', async () => {
    const pilot = await pilotAgentProfile({ root: repoDir() });
    const chain = compilePermissionChain(undefined, pilot.profile.permissions);
    for (const risk of ['write', 'network', 'execute', 'destructive'] as const) {
      const verdict = await evaluatePermission(
        chain,
        { name: `try-${risk}`, needsApproval: false, risk },
        {},
      );
      expect(verdict.verdict).toBe('deny');
      expect(verdict.decidedBy).toBe('deny-rule');
    }
    const undeclared = await evaluatePermission(chain, 'mystery-tool', {});
    expect(undeclared.verdict).toBe('deny');
    // Declared reads stay allowed: the kit itself dispatches.
    const read = await evaluatePermission(
      chain,
      { name: 'read_file', needsApproval: false, risk: 'read' },
      {},
    );
    expect(read.verdict).toBe('allow');
  });

  it('a write-risk tool smuggled into the toolset never executes: the dispatch denies pre-effect', async () => {
    let executed = 0;
    const smuggled = tool({
      name: 'delete_everything',
      description: 'a write tool the pilot must refuse',
      parameters: {},
      risk: 'write',
      execute: () => {
        executed += 1;
        return Promise.resolve('executed');
      },
    });
    const pilot = await pilotAgentProfile({ root: repoDir(), extraTools: [smuggled] });
    const adapter = scriptedAdapter((req: ChatRequest, call: number): ScriptedTurn => {
      void req;
      return call === 0
        ? { toolCall: { name: 'delete_everything', args: {} } }
        : {
            text: 'stopped',
            usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
          };
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' }, profiles: { pilot: pilot.profile } },
    });
    const wf = defineWorkflow({ name: 'probe' }, (ctx) =>
      ctx.agent('try the write tool', { agentType: 'pilot' }),
    );
    const handle = engine.run(wf, undefined);
    const denials: Array<{ verdict?: string; decidedBy?: string }> = [];
    void (async () => {
      for await (const event of handle.events) {
        if (event.type === 'tool:end' && event.outcome === 'denied') {
          denials.push({ verdict: event.verdict, decidedBy: event.decidedBy });
        }
      }
    })();
    const outcome = await handle.result;
    expect(outcome.status).toBe('ok');
    expect(executed).toBe(0);
    expect(denials).toHaveLength(1);
    expect(denials[0]?.decidedBy).toBe('deny-rule');
  });

  it('a drifted registration refuses typed at spawn through the pinned attestation', async () => {
    const pilot = await pilotAgentProfile({ root: repoDir() });
    const stray = tool({
      name: 'stray_addition',
      description: 'appeared after the pin was recorded',
      parameters: {},
      risk: 'read',
      execute: () => Promise.resolve('x'),
    });
    const adapter = scriptedAdapter((): ScriptedTurn => ({ text: 'never reached' }));
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: {
        routing: { loop: 'fake:model' },
        profiles: {
          pilot: { ...pilot.profile, tools: [...(pilot.profile.tools ?? []), stray] },
        },
      },
    });
    const wf = defineWorkflow({ name: 'probe' }, (ctx) =>
      ctx.agent('drift check', { agentType: 'pilot' }),
    );
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('error');
    expect(outcome.error?.message).toMatch(/attestation|toolset/iu);
    expect(outcome.error?.message).toContain('stray_addition');
    expect(adapter.calls).toHaveLength(0);
  });

  it('the happy read-only path researches and finishes under the preset', async () => {
    const pilot = await pilotAgentProfile({ root: repoDir() });
    const adapter = scriptedAdapter((req: ChatRequest, call: number): ScriptedTurn => {
      void req;
      if (call === 0) {
        return { toolCall: { name: 'read_file', args: { path: 'README.md' } } };
      }
      return {
        text: 'dossier: the pilot reads this line',
        usage: { inputTokens: 5, outputTokens: 2, cacheReadTokens: 0, cacheWriteTokens: 0 },
      };
    });
    const engine = createEngine({
      adapters: [adapter],
      stores: { journal: new InMemoryStore({ quiet: true }) },
      defaults: { routing: { loop: 'fake:model' }, profiles: { pilot: pilot.profile } },
    });
    const wf = defineWorkflow({ name: 'probe' }, (ctx) =>
      ctx.agent('read the readme', { agentType: 'pilot' }),
    );
    const outcome = await engine.run(wf, undefined).result;
    expect(outcome.status).toBe('ok');
    expect(outcome.value).toContain('the pilot reads this line');
  });

  it('rejects a root that does not exist, the research template rule', async () => {
    await expect(
      pilotAgentProfile({ root: join(tmpdir(), 'rulvar-definitely-missing-root') }),
    ).rejects.toThrow(ConfigError);
  });
});
