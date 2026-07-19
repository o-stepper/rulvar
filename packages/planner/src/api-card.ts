/**
 * The API card (M6-T04): teaches the planner model EXACTLY the sandbox
 * dialect and global set. The card is a
 * pure constant, byte-stable across runs; plan() (M6-T05) composes it
 * with profileCard(registry) and the goal. The usage examples are
 * distilled from the runnable examples/ corpus (M5-T09).
 *
 * The agent opts line is GENERATED from the runtime allowlist
 * (`SANDBOX_AGENT_OPT_KEYS` in @rulvar/core), so the card can never
 * drift from what the sandbox bridge actually accepts (v1.22.0 review
 * P2-4: the hand-maintained list had silently fallen three options
 * behind, and the card claimed identical calls journal as one result,
 * which the ordinal semantics contradict).
 */
import { SANDBOX_AGENT_OPT_KEYS } from '@rulvar/core';

const CARD: string = [
  'You write ONE JavaScript async-function BODY (the workflow script).',
  'It runs in a deterministic sandbox. The `return` value is the workflow result.',
  '',
  'Available globals (the COMPLETE list; nothing else exists):',
  '- agent(prompt, opts?) -> Promise<value>: one subagent call.',
  `  opts (JSON only): { ${SANDBOX_AGENT_OPT_KEYS.map((key) => `${key}?`).join(', ')} }`,
  '  - schema: a JSON Schema LITERAL (never a library value); the result is the validated object.',
  '  - tools: an array of registered profile NAMES (strings only).',
  "  - onError: 'throw' | 'null' (default 'null'; a failed call yields null and the loss is recorded).",
  '  - model: a string; agentType: a registered profile name from the profile card.',
  '  - routing: a JSON map of invocation role to a model ref from the profile card',
  "    (e.g. { summarize: '<model ref>' }); wins over the profile's own routing.",
  '  - memoizeOutcome: true journals this exact outcome for replay on resume EVEN when it failed (default: failures rerun).',
  "  - replay: 'cache' | 'never'; 'never' forces a fresh live call on every resume, 'cache' reuses any matching prior.",
  '- parallel(fns, opts?) -> Promise<values[]>: concurrent branches; fns is an array of async functions.',
  '  opts: { settle?: true } returns settled outcomes instead of throwing on the first failure.',
  '- pipeline(items, ...stageFns, opts?) -> Promise<results[]>: streams items through stages.',
  "  opts: { onItemError?: 'drop' | 'throw' | 'collect' } (default 'drop').",
  '- step(label, fn, opts?) -> Promise<json>: journals a computation so it never re-runs on resume.',
  '  opts: { deps?: json[], key?: string }. fn must return JSON.',
  '- phase(name, fn) -> Promise<value>: cosmetic grouping for progress and cost reports.',
  "- log(level, msg, data?): telemetry; level is 'debug' | 'info' | 'warn' | 'error'.",
  '- budget.spent() and budget.remaining(): ASYNC here; always `await budget.spent()`.',
  '- workflow(name, args?, opts?) -> Promise<value>: runs a REGISTERED child workflow by name.',
  '- awaitExternal(key, opts?) -> Promise<value>: suspends until an operator provides the value.',
  '  opts: { schema?, prompt? }.',
  '- now() -> number, random(key?) -> number, uuid() -> string: deterministic seeded shims.',
  '',
  'Hard rules:',
  '- No import, require, or export. No fetch. No process. No Node APIs.',
  '- Date.now() and Math.random() ARE the seeded shims; still prefer now() and random().',
  '- Never put functions inside option objects; options are pure JSON.',
  '- Policies are declarative JSON rule tables; ladders are JSON.',
  '- Every call journals as its OWN operation: identical calls share a content key but take',
  '  sequential ordinals (0, 1, 2, ...), so repeats always RUN, never dedupe.',
  '- For deliberate repeats still pass a distinguishing { key }: it binds each result to its',
  '  call by identity instead of position, so editing or reordering the script cannot attach',
  '  an old result to the wrong call on resume.',
  '',
  'Patterns (from the runnable corpus):',
  '- Adversarial panel:',
  "  const votes = await parallel([() => agent('refute: ' + claim), () => agent('refute: ' + claim, { key: 'second-skeptic' })]);",
  '- Judge over drafts:',
  "  const drafts = await parallel(angles.map((a) => () => agent('draft from angle ' + a)));",
  "  const winner = await agent('pick the best draft: ' + JSON.stringify(drafts), { schema: { type: 'object', properties: { index: { type: 'integer' } }, required: ['index'], additionalProperties: false } });",
  '- Fold results without re-paying:',
  "  const digest = await step('fold', () => drafts.join(' | '));",
].join('\n');

/** Renders the sandbox-dialect API card; pure and byte-stable. */
export function apiCard(): string {
  return CARD;
}
