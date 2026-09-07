/**
 * The layered permission chain (M3-T03): the single approval surface for
 * every tool dispatch, regardless of tool origin. The order is fixed and
 * normative: hooks -> deny rules -> ask rules -> canUseTool -> terminal
 * default (allow unless needsApproval, then ask). Evaluation is
 * short-circuit; unconfigured layers are skipped. Rules never yield
 * allow: allow is only ever falling through to canUseTool or the
 * terminal default. Under the opt in `hookAllow: 'advisory'` (RV4911)
 * a hook's allow is held until the deny rules have spoken, and under
 * `inheritPermissions: true` (RV4912) the spawning agent's layer sits
 * between the engine layer and the profile's own.
 *
 * Full contract: https://docs.rulvar.com/guide/tools.
 * Risk presets, the argv shell matcher, domain rules, and the
 * audit/dry-run surface land in M5.
 */
import { compilePermissionPreset } from '../tools/presets.js';
import { lexShellCommand, matchArgvPattern } from '../tools/shell-matcher.js';
import { ConfigError } from '../l0/errors.js';
import { requireDeadlineMs } from '../l0/validate-numbers.js';
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
 * undeclared state conservatively. Argv rules
 * match through the real shell matcher; domain rules are
 * ADVISORY for every tool in the current release: they never
 * change a verdict, and matches surface in the tool:end audit
 * fields (enforcement will live in a first-party fetch tool
 * when one ships).
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
  /**
   * Opt-in monotonic approval composition (RV1507, the eighteenth
   * improvement plan). The chain's documented order lets a generic
   * allow (a hook or canUseTool) clear a `needsApproval: true` tool,
   * which is deliberate for tests and trusted hosts and a fail-open
   * hazard for a platform profile. With this set, an ALLOW verdict
   * from a hook or from canUseTool over a needsApproval tool falls
   * through instead of deciding, so the terminal default still asks;
   * deny and ask verdicts keep their power (tightening stays
   * decisive), input modification still applies, and tools without the
   * declaration keep the historical composition byte for byte. Merges
   * monotonically across the engine and profile layers: either level
   * arms it and a profile cannot loosen an engine-armed mode. A
   * non-boolean value refuses at compile (the RV610 posture: a stray
   * 'true' string must never silently disarm the mode it names).
   */
  strictApprovals?: boolean;
  /**
   * Opt-in deadline for ask verdicts (RV1107): a suspended tool
   * approval nobody resolves within this many milliseconds is DENIED
   * by a journaled resolution by 'timeout' instead of waiting forever.
   * The deadline is journaled ON the suspension entry, so it survives
   * resume and re-arms from the entry, exactly like the flavor B
   * escalation deadline; a racing live decision and the timeout can
   * never both apply (first-closing-wins). A positive integer no
   * larger than the deadline ceiling (one hundred years in
   * milliseconds, RV1204), so now + interval always journals as a
   * valid absolute date. Absent is the historical contract: the
   * approval waits indefinitely.
   */
  approvalDeadlineMs?: number;
  /**
   * The precedence of a hook's allow over the deny tables (RV4911, the
   * tenth comparison experiment's review). Under the documented order a
   * hook's 'allow' decides before the deny rules are read, so for a
   * tool without needsApproval one engine level allow hook silently
   * retires every profile deny rule, the readonly isolation rule and
   * the pilot profile's denial. 'decisive' is that order, the default,
   * byte identical. Under 'advisory' the allow still ends the hook
   * layer (which hooks run does not change) but it is HELD: the deny
   * rules are evaluated over the hook modified input, a match denies,
   * and only then does the held allow decide (ask rules, canUseTool and
   * the terminal default are not consulted, exactly as before). Deny
   * and ask verdicts keep their power, input modification still
   * applies, and strictApprovals keeps its own precedence over the
   * allow. Merges monotonically across the engine, inherited and
   * profile layers: any layer arming 'advisory' arms it. A value
   * outside the two refuses at compile (the RV610 posture).
   */
  hookAllow?: 'decisive' | 'advisory';
}

/**
 * Profile-level permissions.
 * inheritPermissions governs SUBAGENT inheritance: a child gets the
 * engine layer and its own profile layers only, unless the profile opts
 * in, in which case the spawning agent's layer (its chain above the
 * engine layer) is prefixed ahead of the child's own (RV4912). The
 * spawning layers carry that layer on the scope state and hand it to
 * compilePermissionChain as its third argument.
 */
export interface AgentProfilePermissions extends PermissionConfig {
  /** Compiles into deny/ask rules; ships in M5. */
  preset?: 'strict' | 'standard' | 'open';
  /**
   * Default false: the child's chain is the engine layer plus its own
   * profile layers. True prefixes the spawning agent's chain above the
   * engine layer (its hooks, rules, canUseTool, modes, and the deny
   * rule its readonly isolation compiled) ahead of the child's own
   * layers, so a parent deny reaches the child (RV4912). A non boolean
   * refuses at compile.
   */
  inheritPermissions?: boolean;
}

export interface CompiledPermissionChain {
  hooks: PermissionHook[];
  deny: PermissionRule[];
  ask: PermissionRule[];
  canUseTool?: CanUseTool;
  /** The monotonic OR of every layer's strictApprovals (RV1507). */
  strictApprovals?: boolean;
  /** The merged opt-in approval deadline; profile over inherited over engine (RV1107). */
  approvalDeadlineMs?: number;
  /** Present exactly when a layer armed the advisory hook allow (RV4911). */
  hookAllow?: 'advisory';
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
   * Advisory domain-rule matches: reported in the tool:end
   * audit fields, never enforced in the current release.
   */
  advisory?: PermissionRule[];
};

/**
 * Merges the engine-wide config and the profile config into one chain.
 * Layers concatenate engine-first; since rules only deny or ask, ordering
 * within a layer cannot change the verdict. The
 * profile's canUseTool wins over the engine's (a single slot by
 * construction). A declared preset compiles INTO the same layers, after
 * the host-authored rules, never as a fifth layer (M5-T05).
 *
 * The third argument is the spawning agent's layer (RV4912): its own
 * chain compiled with NO engine layer, so the engine layer is never
 * applied twice. It takes effect only when the profile declares
 * `inheritPermissions: true`, and then sits between the engine layer
 * and the profile's own layers: hooks run engine, inherited, profile;
 * the deny and ask tables concatenate in the same order with the
 * preset last; canUseTool and the approval deadline resolve profile
 * over inherited over engine; strictApprovals and hookAllow merge
 * monotonically across all three. Undeclared and false ignore the
 * argument and keep the historical chain byte for byte.
 */
export function compilePermissionChain(
  engine?: PermissionConfig,
  profile?: AgentProfilePermissions,
  parent?: PermissionConfig,
): CompiledPermissionChain {
  const preset =
    profile?.preset === undefined
      ? { deny: [] as PermissionRule[], ask: [] as PermissionRule[] }
      : compilePermissionPreset(profile.preset);
  // The opt in is a boolean or nothing (RV610): a stray 'true' string
  // must never silently disarm the inheritance it names.
  if (
    profile?.inheritPermissions !== undefined &&
    typeof profile.inheritPermissions !== 'boolean'
  ) {
    throw new ConfigError(
      'profile permissions.inheritPermissions must be a boolean when given; got ' +
        JSON.stringify(profile.inheritPermissions),
    );
  }
  const inherited = profile?.inheritPermissions === true ? parent : undefined;
  const deny = [
    ...(engine?.deny ?? []),
    ...(inherited?.deny ?? []),
    ...(profile?.deny ?? []),
    ...preset.deny,
  ];
  const ask = [
    ...(engine?.ask ?? []),
    ...(inherited?.ask ?? []),
    ...(profile?.ask ?? []),
    ...preset.ask,
  ];
  const canUseTool = profile?.canUseTool ?? inherited?.canUseTool ?? engine?.canUseTool;
  // The strict flag merges monotonically (RV1507): either layer arms
  // it and a profile cannot loosen an engine-armed mode, because a
  // safety posture that a child config can silently retire is not a
  // posture. Non-boolean values refuse at compile (RV610).
  for (const [layer, value] of [
    ['permissions.strictApprovals', engine?.strictApprovals],
    ['inherited permissions.strictApprovals', inherited?.strictApprovals],
    ['profile permissions.strictApprovals', profile?.strictApprovals],
  ] as const) {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new ConfigError(`${layer} must be a boolean when given; got ${JSON.stringify(value)}`);
    }
  }
  const strictApprovals =
    engine?.strictApprovals === true ||
    inherited?.strictApprovals === true ||
    profile?.strictApprovals === true;
  // The hook allow precedence merges the same way (RV4911): any layer
  // arming 'advisory' arms it, and a value outside the two refuses.
  for (const [layer, value] of [
    ['permissions.hookAllow', engine?.hookAllow],
    ['inherited permissions.hookAllow', inherited?.hookAllow],
    ['profile permissions.hookAllow', profile?.hookAllow],
  ] as const) {
    if (value !== undefined && value !== 'decisive' && value !== 'advisory') {
      throw new ConfigError(
        `${layer} must be 'decisive' or 'advisory' when given; got ${JSON.stringify(value)}`,
      );
    }
  }
  const advisoryHookAllow =
    engine?.hookAllow === 'advisory' ||
    inherited?.hookAllow === 'advisory' ||
    profile?.hookAllow === 'advisory';
  // Most specific wins: a profile deadline overrides the inherited
  // one, which overrides the engine's, a single slot like canUseTool.
  // Validated here so every layer shares one chokepoint: a zero,
  // negative, or fractional deadline would arm a nonsense timer
  // (RV1107), and an interval over the deadline ceiling could not
  // journal as a valid absolute date (RV1204), so both refuse to
  // compile instead.
  const approvalDeadlineMs =
    profile?.approvalDeadlineMs ?? inherited?.approvalDeadlineMs ?? engine?.approvalDeadlineMs;
  if (approvalDeadlineMs !== undefined) {
    requireDeadlineMs(approvalDeadlineMs, 'permissions.approvalDeadlineMs');
  }
  return {
    hooks: [...(engine?.hooks ?? []), ...(inherited?.hooks ?? []), ...(profile?.hooks ?? [])],
    deny,
    ask,
    ...(canUseTool === undefined ? {} : { canUseTool }),
    ...(strictApprovals ? { strictApprovals: true } : {}),
    ...(approvalDeadlineMs === undefined ? {} : { approvalDeadlineMs }),
    ...(advisoryHookAllow ? { hookAllow: 'advisory' as const } : {}),
  };
}

/** The command text an argv rule matches against. */
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
    // Advisory for every tool in the current release: never a
    // verdict; matches surface through the advisory scan.
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
 * Advisory domain-rule matches for the audit payload:
 * reported, never enforced in the current release.
 */
function advisoryMatches(chain: CompiledPermissionChain, toolName: string): PermissionRule[] {
  return [...chain.deny, ...chain.ask].filter(
    (rule) => 'domains' in rule && rule.tool === toolName,
  );
}

/**
 * Unmatchable segments (command/process substitution, here-docs) yield
 * ask, ALWAYS, for any tool that has argv rules.
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

/** A stub ToolContext for offline (dry-run) evaluations. */
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
 * hypothetical call by tool name (the dry-run API: nothing executes;
 * shells and tests read the verdict, the
 * deciding layer, and the matched rule). Hooks run in deterministic
 * registration order; { modifiedInput } substitutes the input and
 * continues; the first decisive verdict wins. The returned input is what
 * execute receives and what the approval identity hashes (post hook
 * modification). Advisory domain-rule matches
 * ride every verdict for the audit payload.
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
  // The monotonic mode (RV1507): with strictApprovals armed, a generic
  // ALLOW over a needsApproval tool falls through instead of deciding,
  // so the terminal default still asks; deny and ask keep their power.
  const strictHold = chain.strictApprovals === true && def.needsApproval === true;
  // The advisory hook allow (RV4911): a hook's allow still ends the
  // hook layer, so which hooks run is byte identical to the decisive
  // default, but it is HELD while the deny rules read the hook
  // modified input; a match denies, and only then does the held allow
  // decide. The strict hold above keeps its own precedence: over a
  // needsApproval tool the allow falls through instead of being held.
  const holdHookAllow = chain.hookAllow === 'advisory';
  let heldAllow = false;

  let effective = input;
  for (const hook of chain.hooks) {
    const verdict = await hook(def.name, effective, context);
    if (verdict === undefined) {
      continue;
    }
    if (verdict === 'allow' && strictHold) {
      // RV1507: the allow neither decides nor stops later hooks.
      continue;
    }
    if (verdict === 'allow' && holdHookAllow) {
      heldAllow = true;
      break;
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
  if (heldAllow) {
    // RV4911: no deny rule matched; the held allow decides now, and it
    // still names the hook as the deciding layer.
    return withAdvisory({ verdict: 'allow', decidedBy: 'hook', input: effective });
  }
  for (const rule of chain.ask) {
    if (ruleMatches(rule, def.name, risk, effective)) {
      return withAdvisory({ verdict: 'ask', decidedBy: 'ask-rule', rule, input: effective });
    }
  }
  if (argvUnmatchableAsk(chain, def.name, effective)) {
    // Substitutions and here-docs are unmatchable: ask, always.
    return withAdvisory({ verdict: 'ask', decidedBy: 'ask-rule', input: effective });
  }
  if (chain.canUseTool !== undefined) {
    const verdict = await chain.canUseTool(def.name, effective, context);
    if (verdict === 'allow') {
      if (!strictHold) {
        // Decisive, including for needsApproval: true tools.
        return withAdvisory({ verdict: 'allow', decidedBy: 'canUseTool', input: effective });
      }
      // RV1507: the allow falls through to the terminal default,
      // which asks for exactly the tools that declared the need.
    } else if (verdict === 'deny') {
      return withAdvisory({ verdict: 'deny', decidedBy: 'canUseTool', input: effective });
    } else {
      effective = verdict.modifiedInput;
    }
  }
  if (def.needsApproval) {
    return withAdvisory({ verdict: 'ask', decidedBy: 'default', input: effective });
  }
  return withAdvisory({ verdict: 'allow', decidedBy: 'default', input: effective });
}
