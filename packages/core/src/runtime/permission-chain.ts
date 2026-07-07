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
import { ConfigError } from '../l0/errors.js';
import type { ToolContext, ToolDef, ToolRisk } from '../l0/spi/toolsource.js';

export type HookVerdict = 'allow' | 'deny' | 'ask' | { modifiedInput: unknown } | undefined;

export type PermissionHook = (
  toolName: string,
  input: unknown,
  ctx: ToolContext,
) => HookVerdict | Promise<HookVerdict>;

/**
 * Declarative rule tables (no closures). The argv and domain forms are
 * part of the normative vocabulary but their matchers land in M5;
 * compiling them before that is a fail-early ConfigError.
 */
export type PermissionRule =
  | { tool: string | string[] }
  | { risk: ToolRisk | ToolRisk[] }
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

export type PermissionVerdict =
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
    };

function assertRuleSupported(rule: PermissionRule, layer: string): void {
  if ('argv' in rule) {
    throw new ConfigError(
      `${layer} rule for tool '${rule.tool}' uses argv patterns; the argv-parsing shell ` +
        'matcher lands in M5 (docs/08, section 5)',
    );
  }
  if ('domains' in rule) {
    throw new ConfigError(
      `${layer} rule for tool '${rule.tool}' uses network-domain matching; domain rules ` +
        'land in M5 (docs/08, section 4.4)',
    );
  }
}

/**
 * Merges the engine-wide config and the profile config into one chain.
 * Layers concatenate engine-first; since rules only deny or ask, ordering
 * within a layer cannot change the verdict (docs/08, section 4.2). The
 * profile's canUseTool wins over the engine's (a single slot by
 * construction).
 */
export function compilePermissionChain(
  engine?: PermissionConfig,
  profile?: AgentProfilePermissions,
): CompiledPermissionChain {
  if (profile?.preset !== undefined) {
    throw new ConfigError(
      `permission preset '${profile.preset}' is declared but presets compile in M5 ` +
        '(docs/08, section 4.2); use explicit deny/ask rules until then',
    );
  }
  const deny = [...(engine?.deny ?? []), ...(profile?.deny ?? [])];
  const ask = [...(engine?.ask ?? []), ...(profile?.ask ?? [])];
  for (const rule of deny) {
    assertRuleSupported(rule, 'deny');
  }
  for (const rule of ask) {
    assertRuleSupported(rule, 'ask');
  }
  const canUseTool = profile?.canUseTool ?? engine?.canUseTool;
  return {
    hooks: [...(engine?.hooks ?? []), ...(profile?.hooks ?? [])],
    deny,
    ask,
    ...(canUseTool === undefined ? {} : { canUseTool }),
  };
}

function ruleMatches(rule: PermissionRule, toolName: string, risk: ToolRisk | undefined): boolean {
  if ('risk' in rule) {
    const risks = Array.isArray(rule.risk) ? rule.risk : [rule.risk];
    return risk !== undefined && risks.includes(risk);
  }
  const tools = Array.isArray(rule.tool) ? rule.tool : [rule.tool];
  return tools.includes(toolName);
}

/**
 * Evaluates the chain for one dispatch. Hooks run in deterministic
 * registration order; { modifiedInput } substitutes the input and
 * continues; the first decisive verdict wins. The returned input is what
 * execute receives and what the approval identity hashes (docs/03,
 * section 1.2: post hook modification).
 */
export async function evaluatePermission(
  chain: CompiledPermissionChain,
  def: Pick<ToolDef, 'name' | 'needsApproval' | 'risk'>,
  input: unknown,
  ctx: ToolContext,
): Promise<PermissionVerdict> {
  let effective = input;
  for (const hook of chain.hooks) {
    const verdict = await hook(def.name, effective, ctx);
    if (verdict === undefined) {
      continue;
    }
    if (verdict === 'allow' || verdict === 'deny' || verdict === 'ask') {
      return { verdict, decidedBy: 'hook', input: effective };
    }
    effective = verdict.modifiedInput;
  }
  for (const rule of chain.deny) {
    if (ruleMatches(rule, def.name, def.risk)) {
      return { verdict: 'deny', decidedBy: 'deny-rule', rule, input: effective };
    }
  }
  for (const rule of chain.ask) {
    if (ruleMatches(rule, def.name, def.risk)) {
      return { verdict: 'ask', decidedBy: 'ask-rule', rule, input: effective };
    }
  }
  if (chain.canUseTool !== undefined) {
    const verdict = await chain.canUseTool(def.name, effective, ctx);
    if (verdict === 'allow') {
      // Decisive, including for needsApproval: true tools (docs/08 3.4).
      return { verdict: 'allow', decidedBy: 'canUseTool', input: effective };
    }
    if (verdict === 'deny') {
      return { verdict: 'deny', decidedBy: 'canUseTool', input: effective };
    }
    effective = verdict.modifiedInput;
  }
  if (def.needsApproval) {
    return { verdict: 'ask', decidedBy: 'default', input: effective };
  }
  return { verdict: 'allow', decidedBy: 'default', input: effective };
}
