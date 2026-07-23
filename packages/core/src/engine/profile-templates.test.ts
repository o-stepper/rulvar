/**
 * Agent profile templates (RV-210 close-out): pure preset builders with
 * the stop conditions and the progress contract built in. The research
 * template composes the confined research toolset; every template
 * prepends report_progress; limits overrides merge per key over the
 * template's limits; and the composed research profile actually drives
 * an engine run end to end (report, weighted units, structured partial).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { ConfigError } from '../l0/errors.js';
import { PROGRESS_REPORT_TOOL_NAME } from '../tools/progress.js';
import { createCtx } from './ctx.js';
import {
  IMPLEMENTATION_PROFILE_LIMITS,
  implementationAgentProfile,
  RESEARCH_PROFILE_LIMITS,
  researchAgentProfile,
  REVIEW_PROFILE_LIMITS,
  reviewAgentProfile,
} from './profile-templates.js';
import { makeInternals, scriptedAdapter } from './test-harness.js';

const dir = mkdtempSync(path.join(tmpdir(), 'rulvar-tpl-'));
writeFileSync(path.join(dir, 'a.md'), 'first\nthe needle line\n');

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('profile templates (RV-210 close-out)', () => {
  it('researchAgentProfile composes the toolset, the progress tool, and the stop conditions', () => {
    const { profile, evidence } = researchAgentProfile({ root: dir });
    expect((profile.tools ?? []).map((def) => (def as { name: string }).name)).toEqual([
      'list_files',
      'search_files',
      'read_file',
      'record_evidence',
      'list_evidence',
      PROGRESS_REPORT_TOOL_NAME,
    ]);
    expect(profile.limits).toEqual(RESEARCH_PROFILE_LIMITS);
    expect(profile.description).toContain('report_progress');
    expect(evidence()).toEqual([]);
  });

  it('limits overrides merge per key over the template', () => {
    const { profile } = researchAgentProfile({
      root: dir,
      limits: { maxToolCalls: 10, toolUnits: { max: 12 } },
    });
    expect(profile.limits).toEqual({
      ...RESEARCH_PROFILE_LIMITS,
      maxToolCalls: 10,
      toolUnits: { max: 12 },
    });
  });

  it('a missing root fails at construction, exactly like the raw toolset', () => {
    expect(() => researchAgentProfile({ root: path.join(dir, 'nope') })).toThrow(ConfigError);
  });

  it('implementation and review templates prepend the progress tool over the task tools', () => {
    const impl = implementationAgentProfile();
    expect((impl.tools ?? []).map((def) => (def as { name: string }).name)).toEqual([
      PROGRESS_REPORT_TOOL_NAME,
    ]);
    expect(impl.limits).toEqual(IMPLEMENTATION_PROFILE_LIMITS);
    const review = reviewAgentProfile({ limits: { maxTurns: 5 } });
    expect(review.limits).toEqual({ ...REVIEW_PROFILE_LIMITS, maxTurns: 5 });
    expect(review.description).toContain('review');
  });

  it('the research template drives a run end to end: report, units, structured partial', async () => {
    // The scripted agent alternates the same read and the same search:
    // each tool's canonical byte-identical page duplicates ITS OWN
    // digest without tripping the per-signature cap first, so the
    // no-new-evidence guard ends the run while the recorded report
    // survives as the structured partial.
    const adapter = scriptedAdapter((_req, call) =>
      call === 0
        ? {
            toolCall: {
              name: PROGRESS_REPORT_TOOL_NAME,
              args: { facts: ['a.md holds the needle'], evidence: ['a.md:2'] },
            },
          }
        : call % 2 === 1
          ? { toolCall: { name: 'read_file', args: { path: 'a.md' } } }
          : { toolCall: { name: 'search_files', args: { query: 'needle' } } },
    );
    const { profile } = researchAgentProfile({
      root: dir,
      limits: { maxNoNewEvidenceCalls: 2 },
    });
    const { internals } = makeInternals({
      adapters: [adapter],
      routing: { loop: 'fake:model' },
    });
    const result = await createCtx(internals).agent('study the repo', {
      tools: profile.tools,
      limits: profile.limits,
      result: 'full',
    });
    expect(result.status).toBe('limit');
    expect(result.abortClass).toBe('exploration');
    expect(result.partial).toEqual({
      facts: ['a.md holds the needle'],
      evidence: ['a.md:2'],
      questions: [],
    });
    // Weighted accounting ran: the report was free, each read and each
    // search cost 2 (call order: report, read, search, read, search).
    expect(result.exploration).toMatchObject({
      toolUnitsUsed: 8,
      byTool: { report_progress: 1, read_file: 2, search_files: 2 },
    });
  });
});
