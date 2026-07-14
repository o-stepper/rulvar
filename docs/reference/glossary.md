---
title: Glossary
description: The canonical vocabulary used throughout the Rulvar documentation, grouped by subsystem.
---

# Glossary

The canonical vocabulary used throughout the Rulvar documentation. These terms are used exactly as defined here on every other page; when a page and this glossary appear to disagree, this glossary wins.

Terms are grouped by the subsystem they belong to: the [journal](/guide/journal), the [agent runtime](/guide/agents), [adaptive orchestration](/guide/adaptive-orchestration), and the platform surface around them.

## Journal terms

The journal is Rulvar's durability substrate: a content-addressed memoizing log, not an event-sourcing stream. The full mechanics live in the [journal guide](/guide/journal) and the [durability guide](/guide/durability).

| Term | Definition |
| --- | --- |
| journal | The content-addressed memoizing log of completed effects; the single source of run truth under the never-pay-twice invariant. |
| journal entry | One record in the journal, identified by (scope path, content key, ordinal) and qualified by its hash version. |
| entry kind | The discriminator naming what a journal entry records (`agent`, `rand`, `resolution`, `abandon`, `plan.revision`, and so on), governed by the kinds registry. |
| content key | sha256 over the RFC 8785 canonical JSON of a call's identity input; the content-addressed part of entry identity. |
| scope path | The structural "/"-joined path locating a call site within a run's execution tree; part of entry identity. |
| ordinal | The repeat counter of an identical (scope, key) call within one scope, disambiguating repeated identical calls. |
| live call | A call actually executed (and paid for) against a provider or effectful resource, as opposed to being served from the journal. |
| replay | Serving a completed journal entry's result instead of performing a live call. |
| rerun | Executing a call live again despite an existing journal entry, as directed by the replay disposition. |
| replay disposition | The single canonical kernel predicate (exposed as `replayDisposition`) mapping (entry, fold state) to replay, rerun, or skip. Also called the replay predicate. |
| scoped forward-matching | The resume algorithm matching calls to entries forward within a scope; a miss does not move the cursor and does not suppress later hits. |
| fold (pure fold) | A pure derivation over already-journaled entries producing derived state (plan state, ledger, digests); never a source of new effects. |
| decision entry | The single journaled record of a dynamic decision, written strictly before any of its effects, per the decision-entry principle. |
| ref-entry | An entry (kind `resolution` or `abandon`) referencing an earlier entry by seq (ref < seq), closing or annotating it. |
| resolution | An attempt to close a suspended entry; all attempts pass through the `ResolutionArbiter` and are always appended. |
| abandon | A journaled decision to stop pursuing a subtree; its descendants become derived skipped and cost zero live calls. |
| derived skipped status | The skipped status computed by the abandon fold; never stored in an entry's status field. |
| first-closing-wins fold | Among racing ref-entries for one target, the first appended closing entry wins and alone carries the debit; later entries are superseded. |
| suspended entry | An entry whose completion awaits an external resolution (approval, external input, escalation decision), with an optional journaled deadline. |
| two-phase entry | An entry written as running before dispatch and completed by a terminal status, enabling at-least-once dispatch without double pay. |
| orphaned entry | A running entry whose completing write never arrived (crash); handled by recovery rules on resume. |

::: info Replay is not rerun
Replay serves a completed result for free; rerun deliberately pays again because the disposition table says the stored outcome cannot be trusted for this resume. The two words are never interchangeable in these docs.
:::

## Agent terms

The agent runtime owns the model loop, its checkpoints, and the documents that teach an agent its surface. See the [agents guide](/guide/agents) and the [model routing guide](/guide/model-routing).

| Term | Definition |
| --- | --- |
| turn | One model invocation cycle of an agent: one assistant response together with its tool calls. |
| turn-boundary checkpoint | The canonical-history checkpoint the agent runtime writes at each turn boundary under a durable store; resume continues from the same turn. |
| card | A compact rendered document teaching an agent a surface: the agent profile card, the planner API card, the model knowledge card. |
| model ladder | An ordered sequence of rungs an agent may escalate through, with journaled acceptance gates. |
| ladder rung | One level of the model ladder: a model plus optional effort and per-rung limits. |

## Adaptive orchestration terms

Adaptive orchestration is the opt-in machinery for wide fan-out workloads: typed plans, admission, escalation, and bounded termination. See the [adaptive orchestration guide](/guide/adaptive-orchestration), the [planner guide](/guide/planner), and the [budgets guide](/guide/budgets).

| Term | Definition |
| --- | --- |
| admission | The `AdmissionController` check every spawn passes before any effect: budget reserve, structural limits, dedup and reuse, lineage. |
| admission verdict | The typed decision-entry union (`AdmitVerdict`) produced by admission: admit, reject codes, full reuse, and the other admitting arms. |
| escalation | A child agent's typed report that its task exceeds its scope or is blocked, requesting a decision. |
| plan revision (replan) | A journaled `plan.revision` changing the `TaskPlan` through the rebase algorithm. |
| park / unpark | Suspending a plan node while retaining its checkpoint (park), and resuming it later (unpark). |
| wake (wakeup) | An orchestrator turn triggered by a `wait_for_events` trigger firing. |
| wake digest | The coalesced, snapshot-pinned digest (`WakeDigest`) delivered on wake: digest ordinal, plan hash, completed task digests, escalations, termination and budget blocks, reuse stats. |
| lineage | The retry ancestry linking attempts of one logical task, carrying depth and approach signature; the basis of escalation caps and the single-live-attempt rule. |
| logical task | The stable identity of a task (`LogicalTaskId`) across retries, decompositions, and reuse, minted under the lineage rules. |
| oscillation guard | The guard detecting revision loops (A-B-A plan churn) and forcing a terminating fallback. |
| reuse-by-reference | The admission outcome linking a new plan node to a completed donor entry (a `node.link`) instead of respawning the work. |
| graft | Transplanting a donor subtree's results into the current plan via aliasing during reuse. |
| termination account | The frozen per-run vector of countable resources (spawns, revisions, per-lineage escalations and ladder rungs) debited by decision entries; the basis of the termination guarantee. Wakeups need no counter: every wake is a paid turn against the capped orchestrator sub-account. |
| run budget ceiling | The immutable dollar ceiling fixed at run start; no API, including human-in-the-loop decisions, can raise it. |
| overshoot | Spend beyond the ceiling, bounded by one turn per in-flight agent; the tightest bound possible since providers bill aborted streams. |

::: tip Where these live
Everything in this section is engine-owned typed data, never prose in a transcript. The core admission and termination machinery ships in `@rulvar/core`; the typed plan (`TaskPlan`, the plan runner, the run ledger) ships in `@rulvar/plan`.
:::

## Platform terms

Cross-cutting mechanisms of the runtime and its stores. See the [tools guide](/guide/tools), the [stores guide](/guide/stores), and the [orchestration modes guide](/guide/orchestration-modes).

| Term | Definition |
| --- | --- |
| role quality floors | Per-role explicit model allowlists and denylists in engine config, keeping unsuitable models out of critical roles. |
| permission chain | The ordered tool-permission pipeline: hooks, then deny rules, then ask rules, then `canUseTool`, then the terminal default. |
| worker sandbox | The worker_threads sandbox executing machine-generated scripts with the seeded, journaled global set; a determinism and blast-radius boundary, not a security boundary. |
| lease with fencing epoch | The `LeasableStore` ownership mechanism for queue workers; appends carrying a stale epoch are rejected and invisible. |

## Related pages

- [Journal](/guide/journal) for entry identity, replay, and the disposition table in depth.
- [Durability](/guide/durability) for crash recovery, two-phase entries, and resume.
- [Agents](/guide/agents) for turns, checkpoints, and history projection.
- [Adaptive orchestration](/guide/adaptive-orchestration) for admission, plans, escalation, and termination.
- [Budgets](/guide/budgets) for the three-layer budget, the ceiling, and overshoot.
- [Design principles](/reference/design-principles) for the invariants behind these terms.
