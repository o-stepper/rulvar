# Release and versioning policy

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: the lockstep semver policy and its two exemptions, the pre-1.0 breaking-change convention, the hashVersion release discipline (DEF-6), the 1.0 gate, the release pipeline and checklist, the changelog and migration-note format, the deprecation policy, and the post-1.0 cadence.

Founder decisions carried by this document: lockstep semver across all @lurker/* packages; pre-1.0 breaking changes ride MINOR releases flagged BREAKING; 1.0 ships only after the six SPI seams freeze; milestones map 1:1 to versions; License: TBD (decided before first public release).

## 1. Lockstep policy

All @lurker/* packages plus the umbrella package `lurker` MUST release together with the identical version, even when a package has no changes. Milestones map 1:1 to versions: completing milestone Mx produces exactly one release, per the map in 10-implementation-plan.md, section "Milestone-version table" (M0 -> v0.1.0 through M9 -> v1.0.0, then M10 -> v1.1.0, M11 -> v1.2.0; M12 has no assigned version and is gated).

The policy is implemented mechanically with @changesets/cli 2.x in fixed mode. The fixed group MUST contain every @lurker/* package plus `lurker`, except @lurker/compat (section 2):

```json
{
  "fixed": [["@lurker/*", "!@lurker/compat", "lurker"]]
}
```

The fixed group enumerates the thirteen lockstep package names explicitly (no globs, no negation patterns): explicit enumeration is changesets-version-independent, and a CI repo check asserts the list equals workspace packages minus @lurker/compat (13-toolchain-repo.md, section "Repo bootstrap checklist").

Rationale: lockstep removes an entire class of support questions (which @lurker/core works with which @lurker/plan), makes the journal compatibility story stateable in one sentence per release, and matches how the packages are actually developed: one spec canon, one repo, one test gate.

## 2. Exemptions

Exactly two irregularities exist; no others MAY be added without amending this document.

- **@lurker/compat is the sole package outside lockstep.** It is independently versioned. It contains frozen KeyDeriver profiles for hashVersions that left the support window (DEF-6); its contents are frozen data plus code and MUST NOT be force-bumped by lockstep releases: republishing an unchanged frozen profile under a new version would falsely suggest the profile changed, which is exactly what a frozen profile must never do. @lurker/compat releases only when a profile leaves the window and moves into it.
- **eslint-plugin-lurker is lockstep despite its unscoped name.** ESLint's plugin resolution requires the `eslint-plugin-` prefix, so the package cannot live under the @lurker scope, but it versions and releases in the fixed group like every other package.

## 3. Pre-1.0 convention

While the major version is 0:

- Breaking changes MUST land in MINOR releases and MUST be flagged in a BREAKING section of the changelog (section 7). Example: AgentResult.status gaining the terminal `escalated` value ships in v0.4.0 (M3) and is the flagged breaking change of that release.
- PATCH releases are fixes only: no new features, no behavior changes, no schema or identity changes, no dependency major bumps. A patch that changes any journaled byte is misclassified by definition.
- Because milestones map 1:1 to versions, a pre-1.0 MINOR is a milestone completion; out-of-band patches MAY ship between milestones for defects only.

Known planned BREAKING minors (traceability; the changelog of each release restates these with migration notes per section 7):

| Version | Milestone | Breaking change | Kind |
|---|---|---|---|
| v0.4.0 | M3 | AgentStatus gains terminal `escalated`; exhaustive switches over AgentStatus stop compiling (DEF-1) | compile-time |
| v0.8.0 | M7 | The unified AdmitVerdict union is extended (reuse verdicts, reject codes); exhaustive switches in custom shells and admission SPI extensions stop compiling (DEF-5) | compile-time |
| v0.8.0 | M7 | Reuse-by-reference becomes the default: a byte-identical re-add after cancel/abandon no longer re-executes the subtree and returns the result by reference; runs relying on re-execution against a changed world MUST set `reuse.enabled: false` or `fresh: true`. Documented as the only intentional change of visible semantics in the pre-1.0 line (DEF-5) | behavioral |
| v0.8.0 | M7 | Config key rename: `maxEscalationsPerNode` becomes `maxEscalationsPerLogicalTask` (XF-07); the old key is rejected with a typed ConfigError naming the new key | config |
| v0.8.0 | M7 | The plan-size-scaled revision budget option is removed without deprecation; `maxRevisionsPerRun` is an absolute, non-replenishable counter (DEF-2) | config |
| v0.8.0 | M7 | `plan_revise` result and error schemas widen and WakeDigest gains the mandatory `termination` field; schemaHash and toolsetHash of orchestrator scopes change, so affected VCR cassettes invalidate and must be re-recorded (DEF-2/DEF-8) | tool/journal schema |
| v0.8.0 | M7 | B0, the run budget ceiling, is declared immutable after start: no API, including HITL decisions, can top it up; code that mutated the run budget mid-run or expected HITL top-up breaks deliberately (DEF-2) | API removal (typed runtime error) |

The DEF-5 journal-format additions (new kind `node.link`, new abandon-entry fields) are part of the hashVersion 2 profile; reader tolerance to unknown kinds is normative, and journals without links replay unchanged. Entry identity does not change: SpawnKey reuses the existing content hash, and the DEF-5 fix introduces no hash migration.

## 4. hashVersion release discipline (DEF-6)

The journal compatibility mechanism is specified in 03-journal-spec.md, section "hashVersion"; this section owns its release-facing rules.

- A hashVersion bump is required only when identity derivation, replay semantics, or the kinds/statuses registry change in a way that an in-window engine could not interpret. Additive optional telemetry fields do not require a bump: unknown fields are preserved opaquely.
- Any hashVersion bump MUST ship as at minimum a MINOR release, and MUST include all three artifacts: a compat note in the changelog, a frozen fixture of the previous profile, and contract tests for the new profile (executable policy in 11-testing-strategy.md, section "Frozen journal fixtures").
- The bump and its cause MUST ship atomically in one release, so no already-released journal is invalidated. Precedent: hash-v2 ships in the same release as canonical effort and the kinds/statuses registry v2; CURRENT_HASH_VERSION = 2.
- Support window: the engine reads and resumes entries with hashVersion in [CURRENT-2, CURRENT]. Profiles older than the window move to @lurker/compat (frozen data plus code, independently versioned, tree-shakeable) and are enabled only explicitly via `EngineOptions.extraDerivers`; this is the only window extender. At CURRENT_HASH_VERSION = 2 no profile has yet left the window; `deriverV1` in @lurker/compat is the pattern for when one does.
- Outside the window without extraDerivers, resume MUST fail with the typed JournalCompatibilityError: code HASH_VERSION_TOO_OLD for pre-window journals (hint: enable the deriver from @lurker/compat), HASH_VERSION_TOO_NEW for entries from the future (partial downgrade). The check runs as one scan immediately after load, strictly BEFORE any live call, any append, and any admission reserve: refusal is side-effect free. In queue mode the check repeats at lease acquire, so a worker running an older library can never write into a journal containing newer entries (fencing epoch plus version check).
- Downgrade is unsupported: HASH_VERSION_TOO_NEW is the honest refusal, and the behavior of older engines on newer journals is undefined and documented as such.
- Offline key migration is impossible by construction (hash preimages are not stored in the journal). The only honest modes are matching under the entry's own version or typed refusal; a silent miss with mass re-run is forbidden by construction (I1 never-pay-twice).

Wire-format note: the round-1 field `v` is abolished in favor of `hashVersion`. The old wire format is read via load-time normalization indefinitely (`hashVersion` taken from `hashVersion`, else from `v`, else 1); stores are never rewritten (append-only), and new entries never write `v`. RunMeta carries optional informational hashVersionLow/hashVersionHigh fields; only the journal is authoritative.

## 5. The 1.0 gate

v1.0.0 (M9) MUST NOT ship until every item below holds:

1. The six SPI seams are audited and frozen: ProviderAdapter; JournalStore plus LeasableStore (one seam); TranscriptStore; ScriptRunner; ToolSource; IsolationProvider (canonical list in 02-architecture.md, section "SPI seams and the 1.0 freeze"). The freeze happens only after the server and queue soak of M8 has exercised the seams under multi-process load. ModelKnowledgeStore is exempt: it freezes post-1.0 with KB phase 1 (M10).
2. The complete defect cassette catalog (DEF-1 through DEF-8 plus the round-2 set) is green under replay-strict CI (11-testing-strategy.md, section "Per-milestone exit criteria matrix").
3. The license is decided. Until then every doc and package carries "License: TBD (decided before first public release)"; documents MUST NOT include license text (founder register: 14-open-questions.md, section "Founder-only decisions").
4. Formal trademark clearance (USPTO and EUIPO, software classes) is completed; informal searches show no live conflict, but the formal clearance is the gate.
5. The naming contingency is resolved or consciously carried per 13-toolchain-repo.md, section "Naming risk note" (unscoped npm name, npm org, GitHub org).

## 6. Release pipeline

- Every user-visible change lands with a changeset file; PR CI enforces its presence. BREAKING notes go in the changeset body so they flow into the changelog mechanically.
- changesets/action maintains a standing "Version Packages" PR on main: it runs `changeset version` (bumps every fixed-group package identically, rewrites workspace dependency ranges, writes per-package CHANGELOGs). Merging that PR triggers publish.
- Publishing uses npm trusted publishing (OIDC): the release workflow carries `permissions: id-token: write`; there are no long-lived npm tokens; provenance attestations are generated automatically. Requirements: npm CLI >= 11.5.1 or a recent pnpm 11.x, and one trusted-publisher entry per package on npmjs.com (fourteen entries: the twelve @lurker/* packages, eslint-plugin-lurker, and the umbrella, subject to the naming contingency in 13-toolchain-repo.md, section "Naming risk note"). Entries created after 2026-05-20 must explicitly select allowed actions.
- Provenance is not generated for private repositories: provenance guarantees start when the repository goes public, and this MUST be stated in the release notes of the first public release.
- The release workflow MUST pin a known-good pnpm version (early pnpm 11.0.x shipped an OIDC publishing regression; risk register in 13-toolchain-repo.md, section "Risk register").

### 6.1 Release checklist

A release manager MUST verify, in order:

1. Milestone definition of done met per 10-implementation-plan.md (tasks, acceptance criteria, docs deltas).
2. All CI green, including the replay-strict cassette gate for this milestone (11-testing-strategy.md, section "Per-milestone exit criteria matrix").
3. publint and @arethetypeswrong/cli green on packed tarballs for every publishable package.
4. Committed rolled-up .d.ts diffs reviewed; post-freeze, no frozen seam changed.
5. Changesets present; every breaking change carries a BREAKING section with a migration note (section 7).
6. If identity derivation, replay semantics, or the kinds/statuses registry changed: hashVersion bump discipline satisfied (section 4: minor or higher, compat note, frozen fixture of the previous profile, contract tests).
7. Spec-first rule honored: the docs/ amendment for every behavior change merged before or with the code (README.md, section "Docs versioning and amendment process").
8. Version Packages PR reviewed and merged; publish succeeded via OIDC; provenance visible on npmjs.com for all packages (once public).
9. Git tag pushed; release notes reference the milestone and restate BREAKING items.

## 7. Changelog format and migration notes

- Changelogs are per-package CHANGELOG.md files written by changesets; the fixed group makes the version headers identical across packages.
- Every breaking change MUST appear under a `BREAKING` heading within the release section and MUST include a migration note with three parts: what breaks (API, config, or behavior), how it fails (compile-time, typed runtime error, or changed semantics), and the exact change a consumer makes. The v0.8.0 reuse-by-reference entry, for example, MUST name `reuse.enabled: false` and `fresh: true` as the opt-outs.
- hashVersion bumps additionally carry the compat note: which profile is now CURRENT, the resulting support window, and whether any profile moved to @lurker/compat.
- Changes to journaled schemas that are additive (new optional fields, new telemetry events) SHOULD be listed under a `Journal` heading so operators of long-lived runs can scan them quickly.

## 8. Deprecation policy

- Pre-1.0: an API deprecated in minor N MAY be removed in minor N+1; the deprecation and the removal each carry a BREAKING-adjacent changelog entry (the removal is BREAKING).
- Post-1.0: deprecated APIs are marked with `@deprecated` JSDoc naming the replacement, keep working for the remainder of the current major, and are removed no earlier than the next major.
- Deprecation never breaks replay: journals written by deprecated APIs remain readable per the hashVersion window regardless of API removal. API lifecycle and journal lifecycle are governed independently, and only section 4 governs the latter.

## 9. Post-1.0 cadence and support statement

- v1.1.0 (M10) ships ModelKnowledge phase 1; v1.2.0 (M11) ships phase 2. M12 (phase 3) has no assigned version and is gated on the measured-value checkpoint (05-model-knowledge-spec.md, section "Phases and placement"; criteria tracked in 14-open-questions.md).
- Support statement: fixes land on the latest minor of the current major; there are no long-term support branches. Journal compatibility follows the hashVersion window [CURRENT-2, CURRENT], extended only by explicitly enabling @lurker/compat derivers; this window, not the package version, is the compatibility promise operators should plan against (NFR compatibility window, 01-requirements.md).
- The bridge package @lurker/bridge-ai-sdk tracks the @ai-sdk/provider major line and is documented as the highest-churn package; its provider-major bumps are the most likely driver of post-1.0 BREAKING majors and MUST NOT be smuggled into minors.

## 10. License

License: TBD (decided before first public release). Until the founder decision lands (14-open-questions.md, section "Founder-only decisions"): package.json files carry the placeholder per the template in 13-toolchain-repo.md, section "package.json template"; no document in this set includes license text; and deciding the license is a hard 1.0 gate (section 5). The registry history note that old unscoped `lurker` versions remain GPLv3 is recorded in the naming risk note, 13-toolchain-repo.md.
