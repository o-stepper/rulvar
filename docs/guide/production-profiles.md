---
title: Production profiles
description: "Three documented postures for running rulvar in production: read-only diagnosis, isolated patch, and the merge/deploy authority the library deliberately does not claim, each composed from features the other guides define."
---

# Production profiles

Everything on this page composes features documented elsewhere; nothing here is a new switch. The value of a named profile is that its parts fail closed TOGETHER: each posture below lists what to turn on, what the posture guarantees, and, just as deliberately, what it does not.

## Read-only diagnosis

The posture for investigation workloads: incident triage, repository research, audit sweeps. The run may read anything it is pointed at and must change nothing.

- Give agents read-only toolsets: the [repository research toolset](/guide/agents#the-repository-research-toolset) is built for exactly this shape, and its `record_evidence` entries feed the [claim-consistency pool](/guide/orchestration-modes#the-claim-consistency-pass) so conclusions stay tied to what was actually read.
- Compile [permissions](/guide/tools#permissions) with a deny-by-default preset and `strictApprovals: true`, so a blanket allow from a hook can never silently clear a tool that declared `needsApproval`.
- Declare [evidence contracts](/guide/agents#evidence-contracts) on the reading agents and hold acceptance to them with `requireEvidenceFloor`, so a child that read too little cannot be promoted into the roster that steers synthesis.
- Bound the money before the first call: a run [budget ceiling](/guide/budgets), the [in-flight exposure cap](/guide/budgets#the-opt-in-in-flight-exposure-cap), and the [strict pricing gate](/guide/budgets#the-strict-pre-egress-pricing-gate) together refuse surprise spend instead of reporting it afterward.
- Gate downstream automation on the (`status`, `completion`) pair and the envelope facts, per [the terminal contract for consumers](/guide/observability#the-terminal-contract-for-consumers).

What this posture guarantees: no tool with side effects is reachable, no approval is silently waived, and an accepted result names the evidence it stands on. What it does not guarantee: that the model read everything relevant; the evidence floor bounds under-reading, not judgment.

## Isolated patch

The posture for workloads that produce changes without applying them: fix generation, migration drafts, review remediation.

- Run tool work out of process through the [isolated executor](/guide/isolated-executor) (subprocess or container adapter), so a hostile or model-generated script cannot reach host capabilities.
- Give write access only inside [worktree isolation](/guide/agents#worktree-isolation): the child works on an isolated copy, and its changes come back as patch artifacts the host applies or discards.
- Keep the effect ledger's boundaries in mind: it records what the executor observed, and [what the ledger is NOT](/guide/isolated-executor#what-the-ledger-is-not) (not an outbox, not authorization, not exactly-once) is the reason the APPLY step below stays with the host.
- Put every apply behind an [approval](/guide/tools#approvals) with an explicit `defaultDecision` on unattended flows, so an expired approval resolves the way the host declared, never a library-invented accept.

What this posture guarantees: the blast radius of a bad patch is the worktree it was drafted in, and applying it is a host decision recorded on the host's side. What it does not guarantee: patch quality; validators and review own that.

## Merge and deploy authority: not claimed

There is no rulvar profile for merging to a protected branch, deploying, or mutating production data, and that absence is a design position, not a missing feature. The library gives a host strict hooks and fail-closed gates; it does not own fleet budgets, IAM, transactional outboxes, or multi-region consensus, and a workflow result is [facts, never permission](/guide/observability#the-terminal-contract-for-consumers). A deployment that wants agent-produced changes takes them as artifacts from the isolated-patch posture and pushes them through the same review and release machinery humans use, on infrastructure that owns authorization. Anything that promises otherwise is claiming authority this library deliberately refuses to hold.
