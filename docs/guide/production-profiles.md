---
title: Production profiles
description: "Documented postures for running rulvar in production: read-only diagnosis, isolated patch, the one-call regulated floor, and the merge/deploy authority the library deliberately does not claim, each composed from features the other guides define."
---

# Production profiles

Everything on this page composes features documented elsewhere; nothing here is a new switch. The value of a named profile is that its parts fail closed TOGETHER: each posture below lists what to turn on, what the posture guarantees, and, just as deliberately, what it does not.

## Read-only diagnosis

The posture for investigation workloads: incident triage, repository research, audit sweeps. The run may read anything it is pointed at and must change nothing.

- Give agents read-only toolsets: the [repository research toolset](/guide/tools#the-repository-research-toolset) is built for exactly this shape, and its `record_evidence` entries feed the [claim-consistency pool](/guide/orchestration-modes#the-claim-consistency-pass) so conclusions stay tied to what was actually read.
- Pin each profile's toolset with a [toolset attestation](/guide/tools#the-toolset-attestation), so a drifted or poisoned tool description refuses typed at spawn time instead of silently re-keying into the run.
- Compile [permissions](/guide/tools#the-permission-chain) with a deny-by-default preset and `strictApprovals: true`, so a blanket allow from a hook can never silently clear a tool that declared `needsApproval`.
- Declare [evidence contracts](/guide/agents#the-recommended-tool-budget-posture) on the reading agents and hold acceptance to them with `requireEvidenceFloor`, so a child that read too little cannot be promoted into the roster that steers synthesis.
- Bound the money before the first call: a run [budget ceiling](/guide/budgets), the [in-flight exposure cap](/guide/budgets#the-opt-in-in-flight-exposure-cap), and the [strict pricing gate](/guide/budgets#the-strict-pre-egress-pricing-gate) together refuse surprise spend instead of reporting it afterward.
- Importing tools from an MCP server? Declare `requireBounds: true` on the source (RV1808), so the four discovery bounds (`maxTools`, `maxPages`, `maxSchemaBytes`, `timeouts.discoveryMs`) must all be stated and an unbounded sweep against a remote registry cannot happen by omission; the cycle guards need no configuration. See [MCP](/guide/mcp#bounds).
- Gate downstream automation on the (`status`, `completion`) pair and the envelope facts, per [the terminal contract for consumers](/guide/observability#the-terminal-contract-for-consumers).

What this posture guarantees: no tool with side effects is reachable, no approval is silently waived, and an accepted result names the evidence it stands on. What it does not guarantee: that the model read everything relevant; the evidence floor bounds under-reading, not judgment.

Since RV1606 the profile half of this list ships assembled: `pilotAgentProfile(options)` (async, because the attestation pins the RESOLVED toolset) wraps [`researchAgentProfile`](/guide/orchestration-modes#partial-child-salvage-and-profile-templates) and returns `{ profile, evidence, attestation }` with the toolset attestation recorded, permissions hard-denying every risk class outside declared reads (`write`, `network`, `execute`, `destructive`, and `undeclared` in one deny rule) with `strictApprovals` armed and `inheritPermissions` off, and isolation pinned to `'none'`. A write-risk tool smuggled in through `extraTools` is still attested (the pin covers what the factory resolved) and still refused at dispatch by the risk rule, pre-effect; a registration that drifts from the pin refuses typed at spawn. The engine-level halves of the posture (budget ceiling, exposure cap, strict pricing, acceptance floors) stay explicit engine and run options: a profile cannot set them, and the factory does not pretend to.

## Isolated patch

The posture for workloads that produce changes without applying them: fix generation, migration drafts, review remediation.

- Run tool work out of process through the [isolated executor](/guide/isolated-executor) (subprocess or container adapter), so a hostile or model-generated script cannot reach host capabilities.
- Give write access only inside [worktree isolation](/guide/tools#worktree-isolation): the child works on an isolated copy, and its changes come back as patch artifacts the host applies or discards.
- Keep the effect ledger's boundaries in mind: it records what the executor observed, and [what the ledger is NOT](/guide/isolated-executor#what-the-ledger-is-not) (not an outbox, not authorization, not exactly-once) is the reason the APPLY step below stays with the host.
- Put every apply behind an [approval](/guide/agents#approval-suspensions) with an explicit `defaultDecision` on unattended flows, so an expired approval resolves the way the host declared, never a library-invented accept.

What this posture guarantees: the blast radius of a bad patch is the worktree it was drafted in, and applying it is a host decision recorded on the host's side. What it does not guarantee: patch quality; validators and review own that.

## The regulated floor: one call, refusals typed

Every assurance posture in this library is an opt-in knob, which is correct for a library and hazardous for an unreviewed config: a deployment that hand-assembles twelve options can silently omit the one that mattered. `compileRegulatedProfile(input)` (RV4009) is the one-call composition for workloads that must not run loose. It takes ordinary `{ engine, run, orchestrate? }` options and returns the same shapes with the regulated floor applied:

- `permissions.strictApprovals: true` on the engine defaults (the [monotonic mode](/guide/tools#the-permission-chain); a profile cannot un-arm it).
- `billingReceipts: 'intent'`, so every provider wire journals its [intent before it can bill](/guide/durability#at-least-once-dispatch-exactly-once-pay).
- `determinism: { mode: 'error' }`: bare nondeterminism in workflow bodies refuses instead of warning.
- `strictPricing` armed and `budgetUsd` required, under `budgetPolicy: 'immutable-lifetime'`, so the recorded ceiling binds every later segment.
- `scope` required (RV4007): a regulated run has an owner, recorded at genesis.
- When `orchestrate` options are present: `budget.acceptanceReserve: 'require'`, `citationAudit` must be declared, and any `claimConsistency` runs at `coveragePolicy: 'strict-final'` on the shipped document, not the draft.
- Any profile that declares `tools` must carry a [toolset attestation](/guide/tools#the-toolset-attestation).

The compile REFUSES what it cannot keep: a field that loosens the floor (`billingReceipts: 'async'`, `determinism: { mode: 'warn' }`, a missing budget or scope) throws a typed `ConfigError` naming the field, never a silent overwrite. A config that compiles is a config whose author either stated the floor or left it to be filled; a config that fights the floor fails loud at construction, before any wire.

The returned `profileHash` is a sha256 over the enforced posture map, and the compile writes it into `run.configFingerprint` as `regulated:1:<hash>`. The existing fingerprint machinery does the rest: genesis records it, and a resume asserting a different fingerprint refuses before ownership. No new meta surface, no engine branch: the compiled options are DATA, applied like any others.

What the hash does not cover, deliberately: construction-side postures the options never see. An MCP source's `drift: 'refuse'` and discovery bounds, and the AI SDK bridge's `providerExecutedTools: 'deny'`, are declared where those objects are built; the checklist above and the [MCP](/guide/mcp#bounds) and [providers](/guide/providers) guides own them. A hash must not imply what it cannot verify.

## Merge and deploy authority: not claimed

There is no rulvar profile for merging to a protected branch, deploying, or mutating production data, and that absence is a design position, not a missing feature. The library gives a host strict hooks and fail-closed gates; it does not own fleet budgets, IAM, transactional outboxes, or multi-region consensus, and a workflow result is [facts, never permission](/guide/observability#the-terminal-contract-for-consumers). A deployment that wants agent-produced changes takes them as artifacts from the isolated-patch posture and pushes them through the same review and release machinery humans use, on infrastructure that owns authorization. Anything that promises otherwise is claiming authority this library deliberately refuses to hold.
