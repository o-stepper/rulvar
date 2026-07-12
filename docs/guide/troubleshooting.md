---
title: Troubleshooting
description: Symptom-first fixes for unexpected reruns, journal compatibility errors, early budget exhaustion, stuck runs, determinism lint failures, provider errors, and orphaned journal entries.
---

# Troubleshooting

Every entry below follows the same shape: the symptom you see, the mechanism
behind it, and the fix. If your issue is missing, check the
[FAQ](/reference/faq) or open an issue.

## A resume reruns calls you expected to replay

**Symptom.** `engine.resume` performs live provider calls (and spends money)
for work a previous attempt already completed. The resume preview shows
`misses` where you expected `hits`.

**Cause.** Replay is identity-based, not positional. A journaled call replays
only when the live call reproduces the entry's identity: the same scope path,
the same content key, at the same ordinal among identical repeats. The content
key of an agent spawn hashes the agent type, the requested model spec including
canonical effort, the prompt (or `opts.key` when set), the structured-output
schema hash, the toolset hash, and the isolation spec. Anything that shifts one
of those produces a different key, the match misses, and the call runs live
again.

The three most common triggers:

1. **Prompt content changed.** The prompt enters the key verbatim. Interpolating
   anything volatile (a fetched payload, a summary that differs per attempt, a
   timestamp) re-keys the spawn on every resume.
2. **Tool set or schema changed.** The toolset hash covers each tool's name,
   description, parameter schema, and declared version, so editing a tool
   description re-keys every spawn that carries the tool. Schema hashes cover
   validation keywords only.
3. **Scope path changed.** Moving a call into or out of `ctx.parallel`, between
   branches, between pipeline stages, or into a child workflow changes its
   structural path, and the old entries are no longer visible to it.

What re-keys and what does not:

| Change | Effect on replay |
|---|---|
| Prompt text (without `opts.key`) | Re-keys: reruns |
| `agentType`, requested model, or effort (including via routing and role effort defaults) | Re-keys: reruns |
| Schema validation keywords; tool name, description, parameters, or `version` | Re-keys: reruns |
| `isolation`; moving the call to another scope | Re-keys: reruns |
| `ctx.step` label, `key`, or `deps` | Re-keys the step: re-executes |
| `label`, `ctx.phase` names | No effect |
| `onError`, `retry`, `fallback`, `replay`, `memoizeOutcome`, `limits`, `estCost`, `result`, `stream` | No effect |
| `providerOptions`, `fallbacks` (delivery options) | No effect |
| A tool's `execute` implementation | No effect (bump the tool `version` to force reruns) |
| Schema annotations (`title`, `description`, `default`, `examples`) | No effect |

**Fix.** Pin volatile prompts with `opts.key`, which replaces the prompt in the
content key:

```ts
// Reruns on every resume: the fetched payload differs, so the key differs.
const digest = await ctx.agent(`Summarize:\n${payload}`, { schema });

// Replays: identity is pinned; the prompt may still carry volatile data.
const digest = await ctx.agent(`Summarize:\n${payload}`, {
  schema,
  key: 'summarize-payload',
});
```

To diagnose without spending anything, resume in dry-run mode. It is
replay-strict: the first call that would go live throws a typed
`JournalMissError`, the run settles with that error, and zero live calls are
performed. The preview carries the accounting either way:

```ts
const handle = engine.resume(runId, workflow, { dryRun: true });
await handle.result;
const preview = await handle.preview;
// { hits, misses, skipped, reruns, orphaned, invalidResolutions }
```

In tests, `replayRun` from `@rulvar/testing` runs the same strict mode against
a stored journal and returns the outcome plus the preview; see
[Testing](/guide/testing). Two properties help you reason about diffs: matching
is insertion-stable, so adding a new call costs exactly one live call and never
repays completed neighbors, and deleting a call only orphans its entry (see
[the last section](#orphaned-running-entries-after-a-crash)). One residual
limitation: two intentionally identical calls in one scope bind to journal
entries in journal order, so if you swap them they trade results. Give them
distinct `key` values; the determinism lint warns about duplicate identical
calls. Full identity rules live in [The journal](/guide/journal).

## JournalCompatibilityError when opening a run

**Symptom.** Resume refuses to start with a `JournalCompatibilityError`
(registry code `journal_compat`), before any live call and before any append.

**Cause.** Every journal entry carries a `hashVersion` that versions the whole
identity and replay pipeline as one unit; the current profile is version 2, and
version 1 covers journals written by the earliest releases. The engine reads
and resumes entries whose version falls inside its support window (the current
profile and the two before it). The compatibility scan runs once, immediately
after load and strictly before any live call, append, or budget reserve, so the
refusal is free of side effects; in queue mode it repeats at lease acquire so a
worker running an older library can never write into a newer journal.

The error tells you exactly what happened:

| Field | Meaning |
|---|---|
| `subCode` | `HASH_VERSION_TOO_OLD` or `HASH_VERSION_TOO_NEW` |
| `entrySeq` | The first violating entry |
| `entryHashVersion` | That entry's version |
| `supportedRange` | The `{ min, max }` window this engine reads |
| `hint` | The suggested fix |

**Fix.** For `HASH_VERSION_TOO_NEW`, the journal was written by a newer rulvar
than the one trying to read it: upgrade the reading side. Downgrade is
unsupported by design. For `HASH_VERSION_TOO_OLD`, the journal predates the
window: install `@rulvar/compat` (`pnpm add @rulvar/compat`) and enable the
frozen profile explicitly through `extraDerivers`:

```ts
import { createEngine } from '@rulvar/core';
import { deriverV0Synthetic } from '@rulvar/compat';
import { anthropic } from '@rulvar/anthropic';

const engine = createEngine({
  adapters: [anthropic()],
  // Out-of-window profiles are enabled explicitly, never by default.
  // As of 1.1.0 every historical profile (versions 1 and 2) is still in
  // core, so @rulvar/compat ships only the synthetic testing profile;
  // real frozen profiles move here as future bumps age them out.
  extraDerivers: [deriverV0Synthetic],
});
```

Offline key migration is impossible in principle (the journal stores hashes,
not their preimages), so the only honest modes are matching under the entry's
own version or this typed refusal. A silent miss followed by a mass rerun
cannot happen. Details in
[Journal compatibility](/guide/journal-compatibility).

## Budget exhausted earlier than expected

**Symptom.** The run settles with status `exhausted`, or ctx primitives throw
`BudgetExhaustedError`, while `cost.totalUsd` is still visibly below the
`budgetUsd` you passed.

**Cause.** The first budget layer blocks a spawn when
`spent + committedReserve >= ceiling` on any account in its ancestor chain, and
reserves are committed money you have not spent yet. Every admitted spawn holds
a reserve until it settles:

```text
reserve = opts.estCost
       ?? profile.estCost
       ?? price(countTokens(input) + maxOutputTokens)
       ?? 0.50 USD (engine flat default)
```

A wide `ctx.parallel` fan-out commits many reserves at once, so admission can
hit the ceiling while actual spend is far below it. Two more reserves are easy
to forget: a dynamic orchestrator's finalize reserve is registered in the run
root account from the moment of its reserve decision (admission never spends
finalization money on spawns), and each child workflow sub-account takes a
fraction of the parent remainder (default 0.3) computed after the parent's
finalize reserve.

**Fix.** Give the admission layer accurate numbers instead of the 0.50 USD flat
default: set `estCost` on cheap spawns (or `estCost` on the agent profile), and
check headroom from inside the workflow with `ctx.budget.remaining()` (returns
`null` when the run has no ceiling). If the fan-out is legitimately wide,
raise `budgetUsd` or narrow the parallel width. The exhausted outcome is never
a bare failure: it always carries the full `CostReport` plus the `dropped` and
`pending` evidence, so start there.

The mirror symptom, final spend slightly **above** the ceiling, is expected:
the third layer severs in-flight streams at the ceiling with an `AbortSignal`,
providers bill severed streams, and the overshoot is bounded by one turn per
in-flight agent. Usage cut mid-stream is recorded with `usageApprox: true`.
The full model is in [Budgets](/guide/budgets).

## A run appears stuck

**Symptom.** No new events arrive, or the run settles with status
`suspended` instead of finishing.

**Cause.** The run is waiting on suspensions. `ctx.awaitExternal`, tool
approvals (an `ask` verdict from the permission chain), and escalations that
suspend all write journaled suspended entries; when every in-flight branch is
blocked on one, the run deliberately settles as `suspended` and the process may
exit. Nothing is lost: the outcome lists every open suspension.

```ts
const outcome = await handle.result;
if (outcome.status === 'suspended') {
  for (const p of outcome.pending) {
    console.log(p.key, p.scope, p.prompt, p.deadlineAt ?? 'no deadline');
  }
}
```

**Fix.** Resolve the suspension and let the run continue. Against a live run,
`resolveExternal` settles the waiting position in place; against an exited run,
resume and resolve:

```ts
const resumed = engine.resume(runId, workflow);
await resumed.resolveExternal('legal-signoff', { approved: true });
```

An invalid payload (when the `awaitExternal` declared a schema) throws a typed
`InvalidResolutionError` and journals nothing; the entry stays suspended.
Interactively, `rulvar resume <runId>` prompts for open suspensions from the
terminal; see [the CLI](/guide/cli).

Deadlines behave differently per suspension kind. Approval and escalation
suspensions carry a journaled `deadlineAt` that survives resume: an expired
deadline immediately submits a timeout resolution applying the configured
default decision, an unexpired one re-arms for the remainder. `awaitExternal`
has no deadline in v1, so a run waiting on external input waits until you
resolve it; if you need a hard bound, set the run-level `deadlineAt` in
`RunOptions`, whose crossing cancels the run. If the run is live but merely
slow, remember that a hung provider stream cannot stall it forever: the stream
idle timeout (default 120000 ms) severs the stream and surfaces a retryable
transport error, and per-run concurrency (default 12 model calls) plus any
`perProvider` caps queue spawns rather than dropping them. See
[Durability and resume](/guide/durability).

## Lint errors from the determinism rules

**Symptom.** ESLint fails on workflow modules: bare `Date.now`, `new Date`,
`Math.random`, `fetch`, or `process.env` is flagged, or `Promise.all` over ctx
calls is rejected.

**Cause.** Replay requires the sequence of identity keys your workflow produces
to be stable across processes. Ambient time and randomness produce different
values on every attempt, and once those values reach a prompt or a step
dependency they change content keys and force reruns. `Promise.all` bypasses
`ctx.parallel`, which is where journaling, scheduling, and settled-outcome
semantics live.

**Fix.** Route the nondeterminism through the journal:

| Flagged | Use instead |
|---|---|
| `Date.now()`, `new Date()` | `ctx.now()` |
| `Math.random()` | `ctx.random(key?)` |
| ad-hoc id generation | `ctx.uuid()` |
| `fetch`, `process.env`, other host I/O | `ctx.step(label, fn)` |
| `Promise.all` over ctx calls | `ctx.parallel(tasks)` |

The shims journal their first live value and return it byte-for-byte on every
replay. The plugin ships a flat-config preset with the determinism bans as
errors and the duplicate-identical-call advisory as a warning (fix that one
with `opts.key`):

```ts
// eslint.config.mjs
import { workflowsConfig } from 'eslint-plugin-rulvar';

export default [workflowsConfig];
```

In development the in-process runner also patches `Date.now` and `Math.random`
to warn once per run at runtime. Background in
[Determinism](/guide/determinism).

## Provider failures

### Rate limits

**Symptom.** Spawns settle with `AgentError` kind `rate-limit`, or runs slow
down while retries back off.

**Cause.** Adapters disable SDK autoretries entirely and project provider
errors into a typed vocabulary: a 429 surfaces as retryable with the provider's
`retryAfterMs` attached, and overload plus 5xx responses surface as retryable
transport errors. The core then retries under the journal per the resolved
`RetryPolicy` (a provider-supplied `retryAfterMs` replaces the computed
backoff), and when retries exhaust it fails over through the model's
`fallbacks` list on transport and rate-limit triggers. Failover changes only
the `servedBy` attribution of the entry, never its content key. Only after the
whole chain exhausts does the spawn settle with kind `rate-limit`.

**Fix.** Configure the retry layer and cap your own concurrency per provider
instead of hammering the limit, and give hot paths a failover target:

```ts
const engine = createEngine({
  adapters: [anthropic(), openai()],
  defaults: {
    retry: {
      attempts: 4,
      backoff: { initialMs: 500, factor: 2, maxMs: 15000, jitter: true },
    },
  },
  concurrency: { perProvider: { anthropic: 4 } },
});

// Per call: retries exhaust on the primary, then the fallback serves it.
const answer = await ctx.agent(prompt, {
  model: { model: 'anthropic:claude-sonnet-5', fallbacks: ['openai:gpt-5.4'] },
});
```

Rate-limit failures are transport-class: on resume they rerun, and they are
never memoized even under `memoizeOutcome: true`, so a transient 429 can never
be cached as a final outcome. See [Providers](/guide/providers).

### Refusals

**Symptom.** A spawn fails with `AgentError` kind `terminal` on a request that
looks well-formed.

**Cause.** A provider refusal is a typed outcome, never a silent null: the
adapter surfaces it as a finish with reason `refusal` carrying a `RefusalInfo`
(the provider id plus its stop details), and the runtime maps that finish to an
`AgentError` of kind `terminal`. Terminal errors are task-class: the model
completed its part, and repeating the identical request is usually pointless.

**Fix.** Branch on the full result and handle it as a final outcome; rephrase
the prompt, route to a different model, or use the agent-level `fallback`
option, which triggers a second attempt under a new content key:

```ts
const r = await ctx.agent(prompt, { schema, result: 'full' });
if (r.status === 'error' && r.error?.kind === 'terminal') {
  // Refusal or other final provider outcome; do not retry verbatim.
}
```

Because it is task-class, a refusal under `memoizeOutcome: true` replays on
resume instead of rerunning, which is what you want: the outcome was final.

## Orphaned running entries after a crash

**Symptom.** The resume preview lists entry seqs under `orphaned`, or an
inspected journal (`rulvar inspect <runId> --store .rulvar`) shows `running`
entries with no terminal entry.

**Cause.** Dispatched operations journal in two phases: a `running` entry at
dispatch and a terminal entry at completion. A crash between the two leaves a
hanging `running` entry. Two things can then happen at resume:

- The call still exists in your code: the engine re-dispatches it live
  (dispatch is at-least-once; deduplication comes from the journal, so nothing
  completed is ever paid twice), and the fresh terminal completes the same
  journaled operation.
- The call no longer exists (you deleted or re-keyed it): the entry is never
  consumed by any live call and is reported as orphaned.

**Fix.** Usually nothing. Orphaned entries are inert: they are never
re-dispatched, never charged again, and their payloads stay addressable for
audit. Treat the `orphaned` list as a diff signal; if a seq shows up there for
a call you expected to replay, you re-keyed it, and the
[first section](#a-resume-reruns-calls-you-expected-to-replay) applies. One
edge case worth knowing: running and terminal entries always pair within one
`hashVersion`, so a hanging entry written before an engine upgrade is
re-dispatched as a fresh pair at the current version and the old `running`
entry is reported as an orphan. That report entry is bookkeeping, not a bug.

## Still stuck

- [The journal](/guide/journal) explains entry identity and the replay rules
  this whole page leans on.
- [Durability and resume](/guide/durability) covers resume semantics end to
  end.
- [Budgets](/guide/budgets) covers the three budget layers and sizing.
- The [@rulvar/core API reference](/api/@rulvar/core/) documents every error
  class and its fields.
