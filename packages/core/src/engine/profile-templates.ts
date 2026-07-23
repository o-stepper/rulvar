/**
 * Agent profile templates (RV-210 close-out): stock {@link AgentProfile}
 * presets for the three recurring child shapes (research, implementation,
 * review) with the stop conditions ALREADY BUILT IN, so a host stops
 * hand-tuning limits per fan-out. Every template ships the stock
 * `report_progress` tool, wiring the progress contract end to end: the
 * agent reports after every batch, a budget expiry keeps the last report
 * as the structured terminal partial, and an orchestrator running with
 * `acceptance.acceptPartialChildren` can salvage it.
 *
 * Templates are pure functions over their options: the returned profile
 * is plain data, `limits` overrides merge per key over the template's
 * limits (the same shallow-per-field semantics as the UsageLimits layer
 * merge), and nothing here talks to an engine. Register the result under
 * a profile name in `createEngine defaults.profiles` as usual; the
 * ordinary intake validation applies.
 *
 * Public docs: https://docs.rulvar.com/guide/orchestration-modes
 */
import type { ToolDef } from '../l0/spi/toolsource.js';
import type { UsageLimits } from '../runtime/usage-limits.js';
import { progressReportTool } from '../tools/progress.js';
import {
  repositoryResearchToolset,
  type RepositoryResearchToolsetOptions,
  type ResearchEvidenceEntry,
} from '../tools/research.js';
import type { AgentProfile } from './ctx.js';

/**
 * The research template's stop conditions: a weighted unit budget over
 * the research tools (bookkeeping tools are free), per-tool caps, both
 * repetition guards, and soft budget notices. Exported so hosts and
 * tests can read the exact defaults they are overriding.
 */
export const RESEARCH_PROFILE_LIMITS: UsageLimits = {
  maxTurns: 24,
  maxToolCalls: 48,
  toolBudgetNotices: true,
  maxRepeatedToolSignature: 2,
  maxNoNewEvidenceCalls: 6,
  maxCallsPerTool: { list_files: 12, search_files: 20, read_file: 30 },
  toolUnits: {
    max: 64,
    costs: {
      list_files: 1,
      search_files: 2,
      read_file: 2,
      record_evidence: 0,
      list_evidence: 0,
      report_progress: 0,
    },
  },
};

/** The implementation template's stop conditions. */
export const IMPLEMENTATION_PROFILE_LIMITS: UsageLimits = {
  maxTurns: 32,
  maxToolCalls: 64,
  toolBudgetNotices: true,
  maxRepeatedToolSignature: 3,
  noProgressTurns: 3,
};

/** The review template's stop conditions. */
export const REVIEW_PROFILE_LIMITS: UsageLimits = {
  maxTurns: 16,
  maxToolCalls: 32,
  toolBudgetNotices: true,
  maxRepeatedToolSignature: 2,
  maxNoNewEvidenceCalls: 8,
};

/** Options shared by the implementation and review templates. */
export interface AgentProfileTemplateOptions {
  /** Advertised profile description; the template provides a default. */
  description?: string;
  /** Per-key overrides over the template's limits. */
  limits?: UsageLimits;
  /** The task tools; the stock report_progress tool is always prepended. */
  tools?: ToolDef[];
}

/** Options of {@link researchAgentProfile}: the toolset knobs plus template overrides. */
export interface ResearchAgentProfileOptions extends RepositoryResearchToolsetOptions {
  /** Advertised profile description; the template provides a default. */
  description?: string;
  /** Per-key overrides over {@link RESEARCH_PROFILE_LIMITS}. */
  limits?: UsageLimits;
  /** Extra tools appended after the research toolset. */
  extraTools?: ToolDef[];
}

/** What {@link researchAgentProfile} returns: the profile plus the evidence accessor. */
export interface ResearchAgentProfileResult {
  profile: AgentProfile;
  /**
   * The research kit's host-side evidence snapshot. One kit instance
   * backs the profile, so children spawned from the SAME registered
   * profile pool their verified evidence here (and see each other's
   * entries through list_evidence); construct one template per fan-out
   * run, or per child, when isolation matters.
   */
  evidence(): ResearchEvidenceEntry[];
}

function mergeLimits(template: UsageLimits, overrides: UsageLimits | undefined): UsageLimits {
  return { ...template, ...(overrides ?? {}) };
}

/**
 * The batteries-included research child: the confined
 * {@link repositoryResearchToolset} over `root`, the stock
 * report_progress tool, and {@link RESEARCH_PROFILE_LIMITS} as the stop
 * conditions. A child spawned from this profile that runs out of budget
 * settles 'limit' WITH its last progress report as the structured
 * partial, and the recorded evidence stays readable host-side through
 * `evidence()`.
 */
export function researchAgentProfile(
  options: ResearchAgentProfileOptions,
): ResearchAgentProfileResult {
  const { description, limits, extraTools, ...toolsetOptions } = options;
  const kit = repositoryResearchToolset(toolsetOptions);
  const profile: AgentProfile = {
    description:
      description ??
      'Repository research over a confined root: paginated list_files/search_files/read_file ' +
        'with stable cursors, record_evidence verifying every citation, and report_progress ' +
        'after every batch. Stop conditions built in: weighted tool units, per-tool caps, ' +
        'repetition and no-new-evidence guards, budget notices. On limit the last progress ' +
        'report is the structured partial.',
    tools: [...kit.tools, progressReportTool(), ...(extraTools ?? [])],
    limits: mergeLimits(RESEARCH_PROFILE_LIMITS, limits),
  };
  return { profile, evidence: () => kit.evidence() };
}

/**
 * The implementation child template: the caller's task tools plus the
 * progress contract, with {@link IMPLEMENTATION_PROFILE_LIMITS} as the
 * stop conditions (a no-progress detector instead of the research
 * no-new-evidence guard: implementation legitimately re-reads state).
 */
export function implementationAgentProfile(
  options: AgentProfileTemplateOptions = {},
): AgentProfile {
  return {
    description:
      options.description ??
      'Implementation work with built-in stop conditions: tool budget with notices, ' +
        'repeated-call guard, no-progress detector. Report progress with report_progress ' +
        'after every batch; on limit the last report is the structured partial.',
    tools: [progressReportTool(), ...(options.tools ?? [])],
    limits: mergeLimits(IMPLEMENTATION_PROFILE_LIMITS, options.limits),
  };
}

/**
 * The review child template: the caller's task tools plus the progress
 * contract, with {@link REVIEW_PROFILE_LIMITS} as the stop conditions
 * (a tighter turn budget and the no-new-evidence guard: a reviewer
 * circling over the same pages should stop, not spin).
 */
export function reviewAgentProfile(options: AgentProfileTemplateOptions = {}): AgentProfile {
  return {
    description:
      options.description ??
      'Focused review with built-in stop conditions: tight turn and tool budgets with ' +
        'notices, repetition and no-new-evidence guards. Report findings with ' +
        'report_progress after every batch; on limit the last report is the structured ' +
        'partial.',
    tools: [progressReportTool(), ...(options.tools ?? [])],
    limits: mergeLimits(REVIEW_PROFILE_LIMITS, options.limits),
  };
}
