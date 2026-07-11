# Model knowledge specification

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: normative specification of ModelKnowledge, the engine-scoped append-only claim store about model suitability, its data model and store SPI, the kb_pinned/kb_repinned read path, the ledger-mediated write path with a human gate, grounding and decay rules, security posture, and its phased placement in the roadmap.

This document owns the FR-6xx requirement block (registry in 01-requirements.md, section "FR registry"). Delivery: phase 1 in M10 (v1.1.0), phase 2 in M11 (v1.2.0), phase 3 in M12 behind the measured-value checkpoint (section 10; 10-implementation-plan.md, section "Post-1.0 track").

## 1 Feature boundary

ModelKnowledge is an engine-scoped, per-project, append-only store of schematized claims about the suitability of the triple (model, effort, taskClass):

- READ by a run at admission as a journal-pinned snapshot (section 4), re-pinned on every resume from suspension;
- WRITTEN only outside runs through a CAS gate (section 5); runs can only propose, and only into their own RunLedger.

The founder requirements are preserved in full: qualitative knowledge about models exists, is updatable, is not a constant, and the orchestrator can propose updates.

ModelKnowledge is the single sanctioned exception to the v1 ban on cross-run memory (the ban itself stands for facts, lessons and world state; EXC registry in 01-requirements.md). The exception is bounded four ways:

1. Domain: models only. A scopeless claim such as "model X is strong" is inexpressible by the schema; every claim binds a taskClass.
2. Scope: an engine-level SPI whose default is a file in the project under git review (`rulvar.models.json`); global sharing only by explicitly passing a store.
3. Write authority: runs only propose into their own ledger; only out-of-run gates commit.
4. Size: a cap on active claims per (model, taskClass) pair (default 8; 06-execution-spec.md, Appendix A), supersede chains keep only the head active, and the rendered card has a renderBudget aligned with ledger render budgeting (value TBD before M10; 06-execution-spec.md, Appendix A and 14-open-questions.md).

Budget math is untouched: knowledge changes reserves only through the existing admission path (07-adaptive-orchestration-spec.md, section "AdmissionController").

## 2 The seven red-team attacks and their closures

All seven red-team attacks against the feature are closed by concrete decisions, restated here normatively:

1. Poisoned routing. Only eval-measured claims feed routing (the startTier hint compilation). Human-editorial claims render as explicitly marked unverified notes and are never compiled into a tier. The human gate attests attribution, not mere evidence existence. The one-rung clamp (section 4.3) bounds the price of any false belief.
2. propose() race. Removed radically: there is NO propose() method in the SPI at all. Proposals live only in the journaled RunLedger section and reach the gate through the LedgerExport seam (section 5).
3. Stale beliefs across long suspensions. TTL is not decoration: a kb_repinned entry is written on every resume from wait_for_events, HITL approvals and awaitExternal, re-applying expiry filters (section 4.4).
4. Model drift behind stable names. modelEpoch does not promise the impossible: it is declared a coarse signal; an optional canary fingerprint via @rulvar/evals compensates; the TTL of negative eval claims is cut to 30 days as insurance; silent alias re-pointing is documented as an uncaught case absent probes (section 6).
5. Embeddability vs safety. The embeddable default and the safe default coincide by construction: influence and its correction ship in one package. No evals means no eval-measured claims, no automatic tier steering, and nothing to falsify; the falsification sweep is a CLI command requiring no server or fleet.
6. Complexity creep. Partially accepted: the eval-confirmed auto-gate and the corroboration threshold are cut from the committed roadmap. kb_propose is kept (a direct founder requirement) but defanged: journal-only, inert until gated, templated statements; and it is placed behind the measured-value checkpoint after phases 1-2. Full removal was rejected: residual risk after the fixes is near zero and the requirement is explicit.
7. Proposal-volume manipulation. Proposal volume never authorizes eval budget; grouping of matching proposals is display only; the initiating run's provenance is recorded (section 5.2).

## 3 Data model

Key schema decisions: there is no 'orchestrator-proposed' class in the store (a proposal is a run-ledger record, not a claim); propose() is absent from the SPI; GateRecord carries a mandatory attribution attestation; TTL is asymmetric by polarity.

```ts
// Task-class vocabulary aligned with the role quality floors vocabulary
// (04-model-layer-spec.md, section "Role quality floors")
export type TaskClass = 'code-edit' | 'investigation' | 'synthesis' | 'extraction'
  | 'planning' | 'judging' | (string & {});

export type ClaimClass = 'eval-measured' | 'human-editorial';
export type ClaimStatus = 'active' | 'stale' | 'superseded' | 'archived';

export type EvidenceRef =
  | { kind: 'journal'; runId: string; entryRef: number }    // ladder verdicts, escalations, gate decisions; entryRef is the entry seq
  | { kind: 'eval'; reportId: string; caseIds: string[] };  // @rulvar/evals sweep reports

export interface ModelClaim {
  id: string;                                     // ULID
  subject: { model: ModelRef; effort?: Effort };  // effort is part of identity, as in the canonical modelSpec
  taskClass: TaskClass;                           // scopeless global statements are inexpressible by the schema
  polarity: 'strength' | 'weakness';
  statement: string;                              // <=200 chars; for proposal-born claims: a typed template, never a quote from tool output
  class: ClaimClass;
  status: ClaimStatus;
  evidence: EvidenceRef[];                        // mandatory, >=1
  metrics?: { passRate: number; n: number; graderId: string; cost?: number;
              baseline?: { model: ModelRef; passRate: number } };  // writable ONLY by the eval-committer identity
  confidence: 'high' | 'medium' | 'low';
  observedAt: string;                             // ISO date
  expiresAt: string;                              // TTL by class and polarity, section 6
  modelEpoch?: { registryVersion?: string; pricingVersion?: string; capsHash?: string;
                 canaryFingerprint?: string };    // honestly best-effort
  author: { kind: 'eval-pipeline' | 'human'; id: string };
  origin?: { kind: 'kb-proposal'; runId: string; entryRef: number }; // orchestrator proposal provenance
  supersedes?: string;                            // append-only: an edit is a new claim plus supersede
}

export interface KnowledgeSnapshot { version: number; hash: string; claims: ModelClaim[] }

export type GateRecord =
  | { kind: 'human'; approver: string; at: string;
      attribution: { ruledOut: Array<'prompt' | 'tools' | 'difficulty' | 'transient-provider'>;
                     contrastEvidence?: EvidenceRef } }   // without attribution a ClaimOp does not assemble
  | { kind: 'eval-committer'; committerId: string; reportId: string }          // the dedicated committer identity of section 5.4 (M11): the ONLY gate under which eval-measured claims and metrics commit; shape coherence is the schema enforcement (added during M11-T01)
  | { kind: 'eval-confirmed'; reportId: string; n: number; passRate: number }; // reserved for v2, outside the committed roadmap (the proposal auto-gate, NOT the committer identity)

export type ClaimOp =
  | { op: 'add'; claim: ModelClaim; gate: GateRecord }
  | { op: 'supersede'; claimId: string; by: ModelClaim; gate: GateRecord }
  | { op: 'archive'; claimId: string; reason: 'deprecated' | 'stale' | 'rejected' | 'falsified' }
  | { op: 'mark_stale'; claimId: string; reason: 'canary-drift' };  // added during M11-T04: section 6 requires status 'stale' at fingerprint drift and the closed op set could not produce it; idempotent on already-stale claims, gate-free like archive (maintenance authority)

export interface ModelKnowledgeStore {            // SPI, a neighbor of JournalStore
  current(): Promise<KnowledgeSnapshot>;
  commit(ops: ClaimOp[], expectedVersion: number): Promise<number>; // CAS on a monotonic version; UNREACHABLE from the runtime
}
// The runtime receives Pick<ModelKnowledgeStore, 'current'>. There is no propose() method in the SPI at all.

export interface KbProposal {                     // lives ONLY in the RunLedger section 'modelObservations'
  subject: { model: ModelRef; effort?: Effort };
  taskClass: TaskClass;
  polarity: 'strength' | 'weakness';
  trigger: 'error' | 'limit' | 'schema-exhausted' | 'verify-failed' | 'no-progress' | 'escalation';
  evidence: Array<{ kind: 'journal'; runId: string; entryRef: number }>; // must resolve into THIS run's journal only
  note?: string;                                  // <=200 chars; not rendered into any prompt before the gate
}
// Default store implementation: the file ./rulvar.models.json in the repository, git-diffable, serverless, embeddable.
```

Notes:

- `EvidenceRef.entryRef` and the proposal/origin `entryRef` fields are numbers, the journal entry `seq`, consistent with the canonical EntryRef being a seq (cross-review amendment; XF registry in 07-adaptive-orchestration-spec.md, section "Cross-fix mapping").
- `Effort` is the five-level canonical enum from 04-model-layer-spec.md, section "Canonical effort".
- ModelKnowledgeStore is an SPI seam that freezes post-1.0, together with KB phase 1, not at the 1.0 freeze of the six core seams (02-architecture.md, section "SPI seams and the 1.0 freeze").
- How a spawn acquires its TaskClass was the phase-1 blocker and closed at M10-T05 (OQ-12, 14-open-questions.md): author declaration through the optional `taskClass` field on AgentProfile and TaskSpec, defaulting to unclassified; card recommendations do not apply to unclassified spawns. Mapping custom TaskClass strings to eval tags stays tracked in 14-open-questions.md.

## 4 Read path

### 4.1 One read at admission

One read happens at run admission, before the first orchestrator turn: the engine calls `store.current()`, filters claims (status `active`, not expired by `expiresAt`, and only models reachable through the run's declared ladders after the role-floor filter), and renders `modelKnowledgeCard(snapshot, ladders, floors)`: a deterministic pure function producing a compact card in the profileCard tradition. kb_pinned is written only for runs that resolve an orchestrate-role invocation (07-adaptive-orchestration-spec.md, section "Scope and applicability per mode"). An engine with NO modelKnowledge store configured writes no kb entries at all: the feature is store-gated (createEngine stores.modelKnowledge, 06-execution-spec.md), so journals recorded without a store stay byte-stable forever. (Clarified during M10-T03.)

### 4.2 kb_pinned and kb_repinned decision entries

The engine journals one decision entry `kb_pinned { version, hash, cardText }` with the card bytes embedded in the entry. Replay and resume read the journal entry and never touch the live store; a store commit landing in the middle of continuous execution affects only subsequent pins. On every resume from suspension (wait_for_events, HITL approvals, awaitExternal) the engine writes a fresh `kb_repinned` entry under the same filtering rules, so expired, stale and archived claims never steer spawns after multi-day pauses; within continuous execution the pin holds, which is bounded by the run budget ceiling B0. AdmissionController and child spawns read the latest pin of their scope in spawn order, never by wall clock.

### 4.3 The two-layer tier-relative card

The card is tier-relative and two-layered:

- Verified layer: compiled EXCLUSIVELY from eval-measured claims into start-tier recommendations per (ladder, taskClass) pair. The compiler clamps any shift to at most ONE rung away from the ladder's default entry tier, so the price of any false belief is bounded by one rung.
- Notes layer: human-editorial claims rendered tier-relatively with their date and the explicit marking "editorial note, no metrics, not confirmed by evals". They are never compiled into a tier.

The round-2 invariant is preserved: the orchestrator never sees model names; `model_hint.startTier` is clamped to the declared ladder (04-model-layer-spec.md, section "ModelLadder summary"). Without evals in the deployment the verified layer is empty and the card degrades safely to marked notes (section 10, phase 1). The card's renderBudget is enforced by the CHARACTER measure, model-independent and deterministic (OQ-04 closed at M10 entry); the committed budget is 4096 chars (06-execution-spec.md, Appendix A; sizing calibration stays with OQ-08, 14-open-questions.md).

### 4.4 Second consumption path

The maintenance CLI `rulvar kb list` shows claims with full provenance to the humans who author ladders, floors and profiles. This path involves no run and no pin.

## 5 Write path

### 5.1 In-run: kb_propose (phase 3 only)

`kb_propose` is an optional orchestrator tool, registered exactly like `escalate` (opt-in on the profile; 07-adaptive-orchestration-spec.md, section "Orchestrator toolset"). Its payload is schema-validated: subject, taskClass, polarity, a trigger from the typed vocabulary, a statement assembled from a template over that vocabulary, and evidence refs that MUST resolve to decision entries of this same run's journal.

The engine writes the proposal as a journaled `ledger.op` into the RunLedger section `modelObservations` (orchestrator scope only; the single-writer rule is intact; workers contribute evidence only through their journaled ladder verdicts and TaskDigests). There is NO mirroring into the live store: the lost-update race on the file default is eliminated by construction, because proposals from different runs share no medium until the gate. Nothing commits during a run.

### 5.2 Post-run: inbox via LedgerExport

Proposals travel through the existing LedgerExport seam (draft-versioned; 07-adaptive-orchestration-spec.md, section "RunLedger"). The command `rulvar kb inbox` aggregates them from completed runs, groups matching triples (subject, taskClass, polarity) STRICTLY for display (grouping never authorizes spend and never schedules sweeps), and records the initiating run's identity from run metadata. Inbox proposals expire after 14 days (section 6).

### 5.3 The human gate

A human MUST fill the attribution attestation to gate a proposal into a claim: `ruledOut` over the checklist prompt, tools, difficulty, transient-provider, with recommended `contrastEvidence` (evidence that the same taskClass passed on another rung or model). Only then is a human-editorial claim born, carrying `origin` provenance back to the proposing run. Rubber-stamping "evidence exists" is constructively impossible: without `attribution` the GateRecord does not assemble, and without a GateRecord the ClaimOp does not assemble (section 3).

### 5.4 Commit discipline

`commit(ops, expectedVersion)` performs CAS on the monotonic snapshot version, mirroring the fencing-epoch discipline of LeasableStore (03-journal-spec.md, section "Storage SPI"); concurrent maintenance commits serialize through CAS rejection and rebase. Write authority: the eval pipeline (eval-measured claims with metrics, through a dedicated committer identity) and humans (editorial claims, supersede, archive). The runtime physically lacks `commit` on its handle: it holds `Pick<ModelKnowledgeStore, 'current'>`.

The committer identity is the `eval-committer` GateRecord (section 3; added during M11-T01): commit validation is GATE-DRIVEN, and the coherence square is schema-enforced in both directions: an eval-committer-gated op MUST carry class `eval-measured`, author kind `eval-pipeline`, and the metrics block; a human-gated op MUST NOT carry any of the three. In a git-reviewed file world the identity authenticates the same way the human gate does: through the review of the committing change (the pipeline runs from CI under its committerId); the schema coherence is what makes rubber-stamping metrics into an editorial claim constructively impossible.

## 6 Grounding and decay

Two claim classes with different trust:

- eval-measured: the only class with metrics (passRate, n, graderId, cost, baseline), emitted by @rulvar/evals matrix sweeps (workflow x model x taskClass) over the current routing beliefs, through the eval-committer identity. The fixed eval matrix, independent of current routing, is the deconfounder.
- human-editorial: dated ADR-style notes; supersede instead of edit.

TTL is asymmetric by polarity, because a false negative is costlier through lock-in:

| Claim kind          | TTL      |
|---------------------|----------|
| eval strength       | 90 days  |
| eval weakness       | 30 days  |
| editorial strength  | 120 days |
| editorial weakness  | 45 days  |
| inbox proposal      | 14 days  |

Expiry is enforced on every pin AND on every resume re-pin (section 4.2). Expired eval claims land in a re-measurement queue, which is just a status filter, not infrastructure.

modelEpoch is declared honestly: a coarse signal built from the registry version, the price-table version and the caps hash. It catches overt model swaps and deprecations (which archive claims, never delete them, so historical runs keep their audit trail); it does NOT catch silent alias re-pointing, a documented limitation absent probes. Optional compensation: the canary fingerprint in @rulvar/evals (a fixed probe set at temperature 0, a hash of normalized outputs), run by a maintenance command; a fingerprint change immediately flips the model's eval claims to `stale`. The no-probe insurance is the 30-day TTL on negative eval claims.

Falsification of negative beliefs: `rulvar kb sweep` (run manually, from CI, or from a user cron), executed by the ordinary engine so it is journaled, VCR-recordable and budgeted, and it MUST include models with active negative claims. The symmetry principle closes the embeddability attack: a deployment without evals gets no eval claims, hence no automatic tier steering, hence nothing to falsify; editorial notes are corrected by the same git review that created them.

Epsilon-exploration in production runs is rejected (EXC registry, 01-requirements.md): the user would pay for deliberately worse routing, the evidence would still be confounded, and the floor-filtered candidate set is too small for bandit convergence.

## 7 Security

The channels are broken structurally, in eight ways:

1. Quarantine is absolute: proposals are not rendered into any prompt of any run, including subsequent turns of the proposing orchestrator, until they pass the gate; garbage injected from the repository or from tool output is inert.
2. Proposal statements are typed templates over the trigger enum vocabulary: text from tool output cannot be quoted into a persistent record.
3. commit is unreachable from inside a run by the shape of the API: the runtime handle is `Pick<ModelKnowledgeStore, 'current'>`, and with propose() deleted a run has no write path into the cross-run medium at all.
4. Metrics are writable only by the eval-committer identity, enforced by schema; observational data never carries metrics and is never auto-promoted. Self-fulfilling routing bias is broken because the deconfounder is a fixed eval matrix independent of current routing.
5. The human gate attests attribution, not evidence existence: the mandatory `ruledOut` checklist plus the recommended contrast evidence; editorial claims are additionally never compiled into a tier at all.
6. The blast radius of any false belief is clamped: compilation shifts the entry tier at most one rung from the ladder default; role floors and ModelCaps stay hard; budget is touched only through the existing admission path.
7. Provenance and anti-gaming: the inbox stores the initiating run's identity; grouping is display only; no volume of proposals authorizes eval spend (there is no auto-gate in the committed roadmap; sweeps are launched only by humans or their schedules from a fixed pool).
8. Replay soundness: kb_pinned and kb_repinned carry the card bytes inside the entry, so replay does not depend on live-store retention; the round-2 governing principle (decision entries before effects, folds pinned to snapshots) holds for the pin, the re-pin, the proposal and the out-of-run commit.

## 8 Composition with the model layer

The power hierarchy is unchanged:

- ModelCaps (mechanical facts) and role quality floors remain HARD router constraints (04-model-layer-spec.md, sections "Router and resolution chain" and "Role quality floors").
- ModelLadder defines the escalation path with quantitative acceptance gates (07-adaptive-orchestration-spec.md, section "ModelLadder").
- ModelKnowledge only ADVISES within the set already permitted by floors and the declared ladder; it never overrides or weakens anything.

ModelKnowledge feeds exactly three places:

1. `model_hint.startTier`: the verified layer of the pinned card, with the one-rung clamp (section 4.3).
2. agentType choice per spawn: the card docks with the profileCard vocabulary.
3. Human authoring of ladders, floors and profiles, via the maintenance view with full provenance (section 4.4).

Deferred runtime startTier promotion (v2, outside the committed map): the engine would compile, at run start, a deterministic promotion table as a pure function of the kb_pinned card bytes and the ladder config, from eval-measured claims ONLY; replay-sound by construction. Cross-run n is what fixes the "per-run statistics amplify cost" objection. It MUST NOT be built until phases 1-2 have shipped and seasoned (14-open-questions.md tracks the startTier demotion signals question).

## 9 Format decision rationale

Structured records win. The founder's skill-file framing is rejected as the storage and update format and accepted as the consumption format:

- A living markdown skill cannot mechanically carry provenance, n, confidence, TTL and model epoch; it does not diff by typed ops; orchestrator appends are unbounded prose that rots, contradicts itself, and is a perfect persistence layer for prompt injections; "update the document" is unmergeable between concurrent runs.
- What the skill intuition got right is preserved: the orchestrator sees a compact readable instruction (the deterministic modelKnowledgeCard render IS that skill-like document, the same pattern as profileCard and the ledger render), and humans read and edit a thing living in their repository: the schematized JSON file `rulvar.models.json` through ordinary code review, where the git commit is the human gate.
- Handwritten qualitative nuance is expressed by the human-editorial class with its bounded statement field and date, not by a free-form file.

## 10 Phases and placement

Affected components: ModelKnowledgeStore SPI (new, a neighbor of JournalStore, file default); RunLedger (modelObservations section); Journal Kernel (kb_pinned and kb_repinned decision entries with embedded card bytes); orchestrator toolset (optional kb_propose, registered like escalate); the modelKnowledgeCard renderer (profileCard pattern, tier-relative, two-layer); @rulvar/evals (matrix sweeps, canary fingerprint, eval-committer identity); maintenance CLI (`rulvar kb list`, `kb inbox`, `kb sweep`); model router (one-rung clamp when compiling `model_hint.startTier`).

ModelKnowledge is outside the v1 core. Milestone mapping (10-implementation-plan.md):

| Phase   | Milestone / version | Scope                                                                                                                                                              |
|---------|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Phase 1 | M10 / v1.1.0        | ModelKnowledgeStore SPI with the file default; human-editorial claims only; kb_pinned and kb_repinned; the tier-relative two-layer card. Without eval claims the verified layer is empty, there is no automatic tier steering, and notes are honestly marked unverified: safe by degradation, and already a living, human-updatable model dossier. |
| Phase 2 | M11 / v1.2.0        | The eval-measured class through the committer identity; matrix sweeps; TTL and staleness; the canary fingerprint; falsification sweeps via `rulvar kb sweep`.        |
| Phase 3 | M12 (version unassigned, gated) | kb_propose; the modelObservations section; the inbox via LedgerExport; the human gate with attribution attestation. Ships ONLY after the measured-value checkpoint of phases 1-2: the card demonstrably improves tier and agentType selection on eval cases. The quantitative criteria of that checkpoint were defined at M11-T06 (OQ-09, 14-open-questions.md: A/B sweeps, rung selection and agentType selection against the no-card baseline). |

Cut from the committed roadmap (v2 candidates): the eval-confirmed auto-gate and the corroboration threshold k (they would require principal authentication and a fixed, rate-capped sweep budget pool so that proposals never spend other people's money); runtime startTier promotion (section 8).

The phase-1 blocker, the taskClass binding rule, closed at M10-T05 by adopting the interim rule as the resolution (OQ-12, 14-open-questions.md): AgentProfile and TaskSpec carry an optional `taskClass` field defaulting to unclassified; card recommendations do not apply to unclassified spawns.
