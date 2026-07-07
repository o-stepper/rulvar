/**
 * The API card (M6-T04): teaches the planner model EXACTLY the sandbox
 * dialect and global set (docs/06, sections 8.2 and 8.3). The card is a
 * pure constant, byte-stable across runs; plan() (M6-T05) composes it
 * with profileCard(registry) and the goal. The usage examples are
 * distilled from the runnable examples/ corpus (M5-T09).
 */

const CARD: string = [
  'You write ONE JavaScript async-function BODY (the workflow script).',
  'It runs in a deterministic sandbox. The `return` value is the workflow result.',
  '',
  'Available globals (the COMPLETE list; nothing else exists):',
  '- agent(prompt, opts?) -> Promise<value>: one subagent call.',
  '  opts (JSON only): { agentType?, model?, effort?, schema?, tools?, onError?, label?, key?, estCost?, limits?, escalation?, fallback?, result? }',
  '  - schema: a JSON Schema LITERAL (never a library value); the result is the validated object.',
  '  - tools: an array of registered profile NAMES (strings only).',
  "  - onError: 'throw' | 'null' (default 'null'; a failed call yields null and the loss is recorded).",
  '  - model: a string; agentType: a registered profile name from the profile card.',
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
  '- Identical calls with identical arguments journal as ONE result; pass { key } to repeat deliberately.',
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
