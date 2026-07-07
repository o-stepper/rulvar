/**
 * The layered permission chain (M3-T03): the single approval surface for
 * every tool dispatch, regardless of tool origin. The order is fixed and
 * normative: hooks -> deny rules -> ask rules -> canUseTool -> terminal
 * default (allow unless needsApproval, then ask). Evaluation is
 * short-circuit; unconfigured layers are skipped. Rules never yield
 * allow: allow is only ever falling through to canUseTool or the
 * terminal default.
 *
 * Owning spec: docs/08-tools-permissions-spec.md, section "Permission
 * chain". Risk presets, the argv shell matcher, domain rules, and the
 * audit/dry-run surface land in M5.
 */
import { compilePermissionPreset } from '../tools/presets.js';
import { lexShellCommand, matchArgvPattern } from '../tools/shell-matcher.js';
import type { ToolContext, ToolDef, ToolRisk } from '../l0/spi/toolsource.js';

export type HookVerdict = 'allow' | 'deny' | 'ask' | { modifiedInput: unknown } | undefined;

export type PermissionHook = (
  toolName: string,
  input: unknown,
  ctx: ToolContext,
) => HookVerdict | Promise<HookVerdict>;

/**
 * Declarative rule tables (no closures). `'undeclared'` in risk
 * position matches every tool WITHOUT declared risk: presets treat the
 * undeclared state conservatively (docs/08, section 4.3). Argv rules
 * match through the real shell matcher (section 5); domain rules are
 * ADVISORY outside the first-party fetch tool (section 4.4): they never
 * change a verdict in M5, and matches surface in audit events.
 */
export type RiskRuleValue = ToolRisk | 'undeclared';

export type PermissionRule =
  | { tool: string | string[] }
  | { risk: RiskRuleValue | RiskRuleValue[] }
  | { tool: string; argv: string | string[] }
  | { tool: string; domains: string[] };

export type CanUseTool = (
  toolName: string,
  input: unknown,
  ctx: ToolContext,
) =>
  | 'allow'
  | 'deny'
  | { modifiedInput: unknown }
  | Promise<'allow' | 'deny' | { modifiedInput: unknown }>;

/** Host-side permission configuration (engine defaults.permissions). */
export interface PermissionConfig {
  hooks?: PermissionHook[];
  deny?: PermissionRule[];
  ask?: PermissionRule[];
  canUseTool?: CanUseTool;
}

/**
 * Profile-level permissions (docs/08, section "Subagent inheritance").
 * inheritPermissions governs SUBAGENT inheritance (mode c orchestrators,
 * M6+): children get their own config only unless explicitly opted in.
 * It is carried as data here and consumed by the spawning layers.
 */
export interface AgentProfilePermissions extends PermissionConfig {
  /** Compiles into deny/ask rules; ships in M5. */
  preset?: 'strict' | 'standard' | 'open';
  /** Default false. */
  inheritPermissions?: boolean;
}

export interface CompiledPermissionChain {
  hooks: PermissionHook[];
  deny: PermissionRule[];
  ask: PermissionRule[];
  canUseTool?: CanUseTool;
}

export type PermissionVerdict = (
  | { verdict: 'allow'; decidedBy: 'hook' | 'canUseTool' | 'default'; input: unknown }
  | {
      verdict: 'deny';
      decidedBy: 'hook' | 'deny-rule' | 'canUseTool';
      rule?: PermissionRule;
      input: unknown;
    }
  | {
      verdict: 'ask';
      decidedBy: 'hook' | 'ask-rule' | 'default';
      rule?: PermissionRule;
      input: unknown;
    }
) & {
  /**
   * Advisory domain-rule matches (docs/08, 4.4): reported in audit
   * events, never enforced outside the first-party fetch tool.
   */
  advisory?: PermissionRule[];
};

/**
 * Merges the engine-wide config and the profile config into one chain.
 * Layers concatenate engine-first; since rules only deny or ask, ordering
 * within a layer cannot change the verdict (docs/08, section 4.2). The
 * profile's canUseTool wins over the engine's (a single slot by
 * construction). A declared preset compiles INTO the same layers, after
 * the host-authored rules, never as a fifth layer (M5-T05).
 */
export function compilePermissionChain(
  engine?: PermissionConfig,
  profile?: AgentProfilePermissions,
): CompiledPermissionChain {
  const preset =
    profile?.preset === undefined
      ? { deny: [] as PermissionRule[], ask: [] as PermissionRule[] }
      : compilePermissionPreset(profile.preset);
  const deny = [...(engine?.deny ?? []), ...(profile?.deny ?? []), ...preset.deny];
  const ask = [...(engine?.ask ?? []), ...(profile?.ask ?? []), ...preset.ask];
  const canUseTool = profile?.canUseTool ?? engine?.canUseTool;
  return {
    hooks: [...(engine?.hooks ?? []), ...(profile?.hooks ?? [])],
    deny,
    ask,
    ...(canUseTool === undefined ? {} : { canUseTool }),
  };
}

/** The command text an argv rule matches against (docs/08, section 5). */
function commandOf(input: unknown): string | undefined {
  if (typeof input === 'string') {
    return input;
  }
  if (typeof input === 'object' && input !== null) {
    const command = (input as { command?: unknown }).command;
    if (typeof command === 'string') {
      return command;
    }
  }
  return undefined;
}

function ruleMatches(
  rule: PermissionRule,
  toolName: string,
  risk: ToolRisk | undefined,
  input: unknown,
): boolean {
  if ('risk' in rule) {
    const risks = Array.isArray(rule.risk) ? rule.risk : [rule.risk];
    if (risks.includes('undeclared') && risk === undefined) {
      return true;
    }
    return risk !== undefined && (risks as ToolRisk[]).includes(risk);
  }
  if ('domains' in rule) {
    // Advisory outside the first-party fetch tool (docs/08, 4.4): never
    // a verdict in M5; matches surface through the advisory scan.
    return false;
  }
  const tools = Array.isArray(rule.tool) ? rule.tool : [rule.tool];
  if (!tools.includes(toolName)) {
    return false;
  }
  if ('argv' in rule) {
    const command = commandOf(input);
    if (command === undefined) {
      return false;
    }
    const patterns = Array.isArray(rule.argv) ? rule.argv : [rule.argv];
    return lexShellCommand(command).some(
      (segment) =>
        !segment.unmatchable && patterns.some((pattern) => matchArgvPattern(pattern, segment.argv)),
    );
  }
  return true;
}

/**
 * Advisory domain-rule matches for the audit payload (docs/08, 4.4):
 * reported, never enforced outside first-party fetch.
 */
function advisoryMatches(chain: CompiledPermissionChain, toolName: string): PermissionRule[] {
  return [...chain.deny, ...chain.ask].filter(
    (rule) => 'domains' in rule && rule.tool === toolName,
  );
}

/**
 * Unmatchable segments (command/process substitution, here-docs) yield
 * ask, ALWAYS, for any tool that has argv rules (docs/08, 5.2 step 3).
 */
function argvUnmatchableAsk(
  chain: CompiledPermissionChain,
  toolName: string,
  input: unknown,
): boolean {
  const hasArgvRules = [...chain.deny, ...chain.ask].some(
    (rule) =>
      'argv' in rule && (Array.isArray(rule.tool) ? rule.tool : [rule.tool]).includes(toolName),
  );
  if (!hasArgvRules) {
    return false;
  }
  const command = commandOf(input);
  if (command === undefined) {
    return true;
  }
  return lexShellCommand(command).some((segment) => segment.unmatchable);
}

/** A stub ToolContext for offline (dry-run) evaluations (docs/08, 4.5). */
function offlineContext(toolName: string): ToolContext {
  return {
    runId: 'dry-run',
    spanId: `dry-run-${toolName}`,
    agent: { agentType: '' },
    cwd: process.cwd(),
    isolation: 'none',
    signal: new AbortController().signal,
    log: () => undefined,
  };
}

/**
 * Evaluates the chain for one dispatch, or OFFLINE against a
 * hypothetical call by tool name (the dry-run API of docs/08, section
 * 4.5: nothing executes; shells and tests read the verdict, the
 * deciding layer, and the matched rule). Hooks run in deterministic
 * registration order; { modifiedInput } substitutes the input and
 * continues; the first decisive verdict wins. The returned input is what
 * execute receives and what the approval identity hashes (docs/03,
 * section 1.2: post hook modification). Advisory domain-rule matches
 * ride every verdict for the audit payload (docs/08, 4.4).
 */
export async function evaluatePermission(
  chain: CompiledPermissionChain,
  tool: string | Pick<ToolDef, 'name' | 'needsApproval' | 'risk'>,
  input: unknown,
  ctx?: ToolContext,
): Promise<PermissionVerdict> {
  const def = typeof tool === 'string' ? { name: tool, needsApproval: false as boolean } : tool;
  const risk = typeof tool === 'string' ? undefined : tool.risk;
  const context = ctx ?? offlineContext(def.name);
  const advisory = advisoryMatches(chain, def.name);
  const withAdvisory = (verdict: PermissionVerdict): PermissionVerdict =>
    advisory.length === 0 ? verdict : { ...verdict, advisory };

  let effective = input;
  for (const hook of chain.hooks) {
    const verdict = await hook(def.name, effective, context);
    if (verdict === undefined) {
      continue;
    }
    if (verdict === 'allow' || verdict === 'deny' || verdict === 'ask') {
      return withAdvisory({ verdict, decidedBy: 'hook', input: effective });
    }
    effective = verdict.modifiedInput;
  }
  for (const rule of chain.deny) {
    if (ruleMatches(rule, def.name, risk, effective)) {
      return withAdvisory({ verdict: 'deny', decidedBy: 'deny-rule', rule, input: effective });
    }
  }
  for (const rule of chain.ask) {
    if (ruleMatches(rule, def.name, risk, effective)) {
      return withAdvisory({ verdict: 'ask', decidedBy: 'ask-rule', rule, input: effective });
    }
  }
  if (argvUnmatchableAsk(chain, def.name, effective)) {
    // Substitutions and here-docs are unmatchable: ask, always
    // (docs/08, 5.2 step 3).
    return withAdvisory({ verdict: 'ask', decidedBy: 'ask-rule', input: effective });
  }
  if (chain.canUseTool !== undefined) {
    const verdict = await chain.canUseTool(def.name, effective, context);
    if (verdict === 'allow') {
      // Decisive, including for needsApproval: true tools (docs/08 3.4).
      return withAdvisory({ verdict: 'allow', decidedBy: 'canUseTool', input: effective });
    }
    if (verdict === 'deny') {
      return withAdvisory({ verdict: 'deny', decidedBy: 'canUseTool', input: effective });
    }
    effective = verdict.modifiedInput;
  }
  if (def.needsApproval) {
    return withAdvisory({ verdict: 'ask', decidedBy: 'default', input: effective });
  }
  return withAdvisory({ verdict: 'allow', decidedBy: 'default', input: effective });
}
