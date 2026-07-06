# Journal specification

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06
Purpose: Normative specification of the journal kernel: entry identity, the replay predicate, forward-matching, suspension and resolutions, abandon and reuse-by-reference, lineage, hashVersion, and the storage SPI.

The journal is the source of truth for a run (invariant I2, decision-entry principle; see 00-overview.md, section "Invariants I1-I6"). Every effectful operation is appended as a journal entry through a pluggable store. This document is the single canonical home for entry identity and replay semantics; no layer above the Journal Kernel may redefine or duplicate them (DEF-1). The Journal Kernel ships in milestone M2 (v0.3.0), strictly before the Agent Runtime in M3, so that the replay predicate is never smeared across two layers and two stages (DEF-1 ordering rule; see 10-implementation-plan.md, section "Planning rules").

Requirements for this document live in the FR-0xx block of 01-requirements.md (section "FR registry"). Rules folded in from the defect-fix specifications carry their (DEF-n) marker for traceability: DEF-1 (replay predicate), DEF-3 (lineage), DEF-4 (decide-once and abandon), DEF-5 (reuse-by-reference), DEF-6 (hashVersion).

## 1. Identity model

Identity is content-addressed and scoped (DEF-6 defines the versioning frame for everything in this section; see section 4).

### 1.1 Content key

The content key of an entry MUST be computed as:

```
key = sha256( JCS(IdentityInput) )
```

where JCS is the canonical JSON serialization of RFC 8785 (JSON Canonicalization Scheme): lexicographically sorted object members, minimal escaping, no insignificant whitespace, canonical number formatting. The hash function, the canonicalization algorithm, and the composition of IdentityInput are all frozen as part of the hashVersion 2 profile (section 4) and covered by golden fixtures (11-testing-strategy.md, section "Frozen journal fixtures").

### 1.2 IdentityInput per entry kind

Every content-keyed kind has an exact IdentityInput record. Fields not listed for a kind MUST NOT be included.

```ts
// Spawn entries: ctx.agent and orchestrator spawn tools (kind 'agent').
export interface AgentIdentityInput {
  kind: 'agent';
  agentType: string;
  modelSpec: CanonicalModelSpec; // the REQUESTED model spec, including canonical effort;
                                 // declared in 04-model-layer-spec.md, section "Router
                                 // and resolution chain" (effort: section "Canonical
                                 // effort"); for laddered spawns it embeds the declared
                                 // ladder together with startTier
  prompt: string;                // replaced verbatim by opts.key when opts.key is set
  schemaHash: string;            // section 3
  toolsetHash: string;           // section 3
  isolation: IsolationSpec;      // 'none' | 'readonly' | { kind: 'worktree'; ref?: string }
                                 // canonical encoding per 08-tools-permissions-spec.md,
                                 // section "IsolationProvider and worktree lifecycle"
}

// Nested workflow spawns: ctx.workflow (kind 'child').
export interface ChildIdentityInput {
  kind: 'child';
  workflow: string;              // registered workflow name
  args: Json;                    // canonical JSON of the arguments; opts.key, when set,
                                 // replaces args in the identity for volatile inputs
}

// Journaled effectful steps: ctx.step (kind 'step').
export interface StepIdentityInput {
  kind: 'step';
  key: string;                   // opts.key when set, otherwise the step label
  deps: Json[];                  // declared dependency values (useMemo-style keying;
                                 // semantics in 06-execution-spec.md, section
                                 // "Canonical Ctx interface")
}

// External inputs: ctx.awaitExternal (kind 'external').
export interface ExternalIdentityInput {
  kind: 'external';
  key: string;                   // the awaitExternal key; a duplicate key in one scope
                                 // is an immediate typed error (section 8.1)
}

// Tool-approval suspensions (kind 'approval').
export interface ApprovalIdentityInput {
  kind: 'approval';
  toolName: string;
  input: Json;                   // the tool input as submitted to the permission chain
                                 // (post hook modification; 08-tools-permissions-spec.md)
}

// Deterministic shims: ctx.now / ctx.random / ctx.uuid (kind 'rand').
export interface RandIdentityInput {
  kind: 'rand';
  subtype: 'now' | 'random' | 'uuid';
  key?: string;                  // ctx.random(key) provides a stable alternative to
                                 // positional binding
}
```

For kind `node.link` (DEF-5) the identity input is exactly `{ kind: 'node.link', spawnKey, donorScope, targetNodeId }` hashed in the deciding scope (section 9.5).

For the decision family (kinds `decision`, `plan.revision`, `plan.decision`, `ledger.op`) identity follows the request/value split (DEF-3): only the request part is hashed. The request part contains the proposed content (for `plan.revision`: the PlanOp diff, `lineage.continues`, `relation`, `causeRef`, and the raw approach tag; for `decision`: `decisionType` plus the request being decided). The value part (minted NodeIds and LogicalTaskIds, the normalized approachTag, approachSig/approachSigCoarse with sigVersion, statsBefore, countsAgainstLimit, admit verdicts, budget reserves) is read back on replay and MUST NOT enter the hash. Full payload schemas for these kinds are owned by 07-adaptive-orchestration-spec.md and 05-model-knowledge-spec.md.

Kinds `resolution` and `abandon` are ref-entries: they are addressed by `ref` (target seq), not by content key, and are excluded from forward-matching (section 8.2).

### 1.3 Excluded fields

The following MUST NOT enter any content key: cosmetics (`label`, `phase`), handling policy (`onError`, `retry`, `replay`), policy fields (`memoizeOutcome`), lineage blocks, and `spanId`. Consequences:

- Changing `memoizeOutcome`, `onError`, or retry policy between runs never re-keys existing entries (DEF-1).
- `logicalTaskId` and every lineage block live exclusively in decision-entry payloads and never affect entry identity; adding lineage required no hashVersion bump (DEF-3).
- The `execute` closure of a tool is never hashed (section 3).

### 1.4 Full entry identity and EntryRef

The full identity of an entry is the version-qualified tuple:

```
(scope, hashVersion, key, ordinal)
```

- `scope` is the deterministic structural path of section 2.
- `hashVersion` selects the frozen derivation profile of section 4.
- `ordinal` numbers repeats of the same `(hashVersion, key)` pair inside one scope. It MUST be assigned at append time as the count of prior entries in the same scope carrying the same `(hashVersion, key)` pair (DEF-6).

The canonical EntryRef between entries is `seq` (the per-run total order position). The triple `{scope, contentHash, ordinal}` is permitted only as a debugging projection in telemetry and MUST NOT be used as a reference format anywhere in stored payloads (cross-review ruling; this also fixes `EvidenceRef.entryRef` in 05-model-knowledge-spec.md to a seq number).

```ts
export type EntryRef = number; // seq
```

### 1.5 Worked example

An `agent` spawn with agentType `reviewer`, requested model `anthropic:claude-sonnet-4` at canonical effort `high`, no isolation, and the schema/toolset hashes below produces this IdentityInput in JCS form (one line, shown wrapped). `modelSpec.model` stores the requested canonical ModelRef in the strict `adapterId:model` colon form (04-model-layer-spec.md, section "Router and resolution chain"; FR-108); no other model-string form ever enters identity:

```
{"agentType":"reviewer","isolation":"none","kind":"agent",
 "modelSpec":{"effort":"high","model":"anthropic:claude-sonnet-4"},
 "prompt":"Review the attached diff for correctness.",
 "schemaHash":"f1342f68c9dbb49e8056d0414479659414776dfa4c599b3bebd166c8fdc416ba",
 "toolsetHash":"d2c59d7e8cb64de34366877e8764eab84d615942f14167d8715a15d8dbff105c"}
```

```
key = sha256(JCS) = 66ef15922e576a8f6884b28176c8c21fee9b4d3bb98c76592ed6ca1d3c8f1062
```

If this call is made twice in the same sequential body, the second entry carries the same key with `ordinal: 1`. If `opts.key: "review-final"` were supplied, the `prompt` member would be replaced by `"review-final"` and the key would change accordingly.

Keys are memoized per (call, version) pair: matching a mixed-version journal costs one cheap sha256 per hashVersion present in the scope (DEF-6).

## 2. Scope-path grammar

A scope path is a deterministic structural path, independent of wall-clock (invariant I3: structure comes from call-and-return only). The grammar is part of the hashVersion 2 profile: any change to it requires a hashVersion bump (section 4).

### 2.1 Grammar

```
scope-path    ::= ""                                    ; root sequential body of the run
                | scope-path "/" segment

segment       ::= parallel-seg
                | pipeline-seg
                | workflow-seg
                | agent-seg
                | plan-seg
                | node-seg

parallel-seg  ::= "par:" site ":" branch                ; site, branch: decimal integers >= 0
pipeline-seg  ::= "pipe:" stage ":" item                ; stage, item: decimal integers >= 0
workflow-seg  ::= "wf:" name ":" ordinal                ; name: registered workflow name
agent-seg     ::= "agent:" seq                          ; seq of the agent spawn entry
plan-seg      ::= "plan"                                ; always followed by node-seg
node-seg      ::= NodeId                                ; ULID minted inside plan.revision
```

Segments are joined with `/`. The root sequential body is the empty path.

### 2.2 Segment rules

- Sequential body: a sequential body is ONE scope. Sequential calls add no segment; they are distinguished by key and ordinal only.
- `ctx.phase(name, fn)` is cosmetic for identity: it adds no segment and never affects keys (it is structural only for events and CostReport.byPhase; see 06-execution-spec.md, section "Canonical Ctx interface").
- Parallel branches: each `ctx.parallel` invocation is a parallel site. Site numbers are allocated by a monotonic counter in execution order, not source position (ambiguity ruling). The counter is maintained per enclosing scope; because every scope body is sequential by construction (I3), allocation order is deterministic and identical on every replay. Branch index is the position in the task array. Branch `i` of site `s` executes in scope `parent + "/par:" + s + ":" + i`.
- Pipeline: stage `s` processing source item `i` executes in scope `parent + "/pipe:" + s + ":" + i`. The item index is the index of the ORIGINAL input item, not arrival order, so streaming reorder never shifts identity.
- Nested workflow scopes: `ctx.workflow` opens `parent + "/wf:" + name + ":" + ordinal`, where `name` is the registered workflow name and `ordinal` counts invocations of that name within the enclosing scope in execution order.
- Orchestrator handle spawns: spawns issued through the orchestrator toolset (spawn_agent, parallel_agents) are appended under the orchestrator agent scope `parent + "/agent:" + seq`, where `seq` is the seq of the orchestrator's own spawn entry. Handles returned to the model are those child spawn entry seqs, stable across resume (07-adaptive-orchestration-spec.md, section "Orchestrator toolset").
- Plan children: PlanRunner node scopes are `"plan/" + NodeId`. NodeIds are ULIDs minted by the engine inside the authorizing `plan.revision` entry (never by the model), so they are deterministic on replay (DEF-3, DEF-5).

### 2.3 Examples

| Call site | Scope path |
|---|---|
| Top-level sequential body | `` (empty) |
| Branch 2 of the first parallel site in the root body | `par:0:2` |
| Stage 1, source item 4 of a pipeline inside that branch | `par:0:2/pipe:1:4` |
| Second invocation of child workflow `extract-invoices` in the root body | `wf:extract-invoices:1` |
| Spawn issued by an orchestrator whose spawn entry has seq 17 | `agent:17` |
| PlanRunner node `01JZK3TQ8R4M5N6P7Q8R9S0T1U` | `plan/01JZK3TQ8R4M5N6P7Q8R9S0T1U` |

## 3. schemaHash and toolsetHash derivation

Both hashes are computed from a canonicalized derivative of the JSON Schema, never from runtime closures (the `execute` closure is never hashed: changing an implementation does not invalidate the journal; changing semantics is signaled by bumping the tool `version`; see 08-tools-permissions-spec.md, section "tool() definition and ToolDef").

Schema canonicalization (ambiguity ruling, frozen in the hashVersion 2 profile):

1. Local `$ref` (fragment-only: `#/...` JSON Pointers, `#anchor` references, and the root `#`) MUST be inlined. A recursive local `$ref` cannot be inlined and MUST produce a typed ConfigError at definition time. A `$ref` carrying sibling keywords (legal in draft 2020-12) canonicalizes as the explicit conjunction: the siblings are kept and the inlined target is appended to the node's `allOf`. (Amended during M1-T03: these three sub-rules make the inlining rule total.)
2. Remote `$ref` and dynamic references (`$dynamicRef`, `$dynamicAnchor`) are FORBIDDEN; their presence MUST produce a typed ConfigError at definition time (consistent with the vendored validator subset; 08-tools-permissions-spec.md, section "SchemaSpec").
3. Annotation-only keywords MUST be stripped: `title`, `description`, `default`, `deprecated`, `readOnly`, `writeOnly`, `examples`, `$comment`. `format` is retained (it is validation-relevant in the vendored validator). Reference infrastructure (`$defs`, `definitions`, `$anchor`) is removed after inlining: once every local reference is resolved it is dead weight, and an unused or renamed definition MUST NOT shift a content key. (Amended during M1-T03.)
4. The result is serialized with JCS (RFC 8785) ordering and hashed with sha256.

Derivations:

- `schemaHash = sha256(JCS(canonicalize(outputSchema)))` for the spawn's structured-output schema; the empty hash of the canonical `true` schema is used when no schema is declared.
- `toolsetHash = sha256(JCS(contracts))` where `contracts` is the array of tool contracts `{ name, description, parameters, version }` sorted by `name`, with `parameters` canonicalized per this section. Note that tool `description` is part of the tool contract and DOES enter toolsetHash, while schema annotations inside `parameters` do not.

## 4. hashVersion (DEF-6)

### 4.1 The single versioning mechanism

Every journal entry MUST carry an integer `hashVersion` field versioning the ENTIRE identity and replay pipeline as one unit. There is no separate key-derivation version in RunMeta; the round-1 `v` field is abolished and re-read as hashVersion at load (normalization: `hashVersion` is taken from `hashVersion`, else from `v`, else `1`; stores are never rewritten). Only the journal is authoritative; range fields in RunMeta are advisory (section 12.5).

One version number covers, atomically (everything changes only together, in one bump):

| Covered element | Specified in |
|---|---|
| Canonical JSON algorithm (RFC 8785) | section 1.1 |
| Identity field set (IdentityInput per kind) | section 1.2 |
| Hash function | section 1.1 |
| schemaHash and toolsetHash derivation | section 3 |
| Scope-path grammar and ordinal rules | section 2, section 7.2 |
| Replay predicate table | section 6 |
| Fold defaults for absent fields | section 4.3 |
| Kind and status vocabularies the engine must interpret | section 5 |

`hash-v1` corresponds to round 1 of the design. `hash-v2` ships in the same release as canonical effort, the new kinds, and the new statuses, so no already-released journal is ever invalidated: the mechanism and the reason for the bump ship atomically.

```ts
export type HashVersion = number;                 // 1 = round 1; 2 = current
export const CURRENT_HASH_VERSION: HashVersion = 2;

export function normalizeEntry(raw: unknown): JournalEntry; // round-1 { v: 1 } reads as { hashVersion: 1 }
```

### 4.2 KeyDeriver SPI and registry

The kernel holds a registry of frozen KeyDeriver profiles, one per supported version. A profile is immutable after release and MUST be covered by contract tests on frozen journal fixtures (11-testing-strategy.md, section "Frozen journal fixtures").

```ts
export interface KeyDeriver {
  readonly hashVersion: HashVersion;

  // v1 removes effort from the requested modelSpec; features not expressible in
  // the profile's identity domain yield 'incomparable' (a guaranteed non-match).
  project(input: IdentityInput): CanonicalIdentity | 'incomparable';

  deriveKey(c: CanonicalIdentity): string;        // sha256 of canonical JSON under this version's rules
  schemaHash(schema: JsonSchema): string;
  toolsetHash(tools: ToolContract[]): string;

  // There is NO replayAction method (cross-review ruling): the profile carries the DATA
  // of its frozen disposition table, consumed by the single canonical function
  // replayDisposition(entry, abandonFold) of section 6, dispatched on the entry's
  // hashVersion. 'suspend' is excluded from the disposition set: suspended entries are
  // consumed by the first-closing-wins fold of section 8.
  readonly dispositionTable: Readonly<DispositionTable>;

  readonly foldDefaults: Readonly<{
    effort: Effort;               // 'low' | 'medium' | 'high' | 'xhigh' | 'max'
                                  // (04-model-layer-spec.md, section "Canonical effort")
    memoizeOutcome: boolean;
    budgetAccount: 'root';
  }>;
  // For v1: effort 'medium', memoizeOutcome false, budgetAccount 'root'.
}

export interface EngineOptions {
  extraDerivers?: KeyDeriver[];   // imported from @lurker/compat; default window [CURRENT-2, CURRENT]
}

// @lurker/compat: one export per version that has left the window, e.g.:
export const deriverV1: KeyDeriver;
```

### 4.3 The v1 profile and foldDefaults

The v1 profile projects the current identity input DOWN: `effort` is removed from the requested modelSpec (the v1 predicate is effort-insensitive by construction; otherwise a change of role effort defaults between releases would miss the entire paid prefix and reproduce the very defect this mechanism fixes). schemaHash and toolsetHash are computed under v1 rules.

The defined default for a missing `effort` lives in the FOLD layer, never in matching identity: any DERIVED read of a legacy entry (pricing, ladder statistics, digests, the budget fold) reads `effort` as `medium` through the v1 profile's `foldDefaults`. In the same place `memoizeOutcome` reads as `false` and spend is attributed to the root budget sub-account.

If a live call uses a feature not expressible in v1 (kind `decision`, `plan.revision`, and so on), `project` returns `incomparable` and the match honestly fails; false cross-domain hash collisions are excluded.

### 4.4 Matching under versions

- The per-scope forward cursor is unchanged (section 7). A live call C matches a journaled entry E ahead of the cursor if and only if `project(E.hashVersion, identityInput(C))` is comparable and `deriveKey` of that version equals `E.key`.
- The live call is compared against every unconsumed entry ahead of the cursor with the key computed UNDER THAT ENTRY'S VERSION; `incomparable` is a guaranteed non-match. If one live call matches both a v1 entry (under the v1 key) and a later v2 entry (under the v2 key) in one scope, the forward order resolves it deterministically: the FIRST unconsumed matching entry in journal order is consumed.
- NEW entries are always written with `CURRENT_HASH_VERSION`: journal migration is incremental, a mixed-version journal is legal, and the version boundary runs between entries, not runs.
- The action taken on a matched entry is decided by the disposition table of the entry's own profile, through the single `replayDisposition` function (section 6.6).
- running/terminal pairs are always single-version: a hanging v1 `running` entry at resume spawns a FRESH v2 `running` entry (at-least-once); the v1 orphan goes to the orphaned-entries report.
- Resolution of a suspended entry is performed by a superseding append at the current version, referenced by seq (section 8); the suspended entry's own identity stays at its version and keeps matching under its own predicate.
- Ordinal example: two identical calls paid before an upgrade exist as v1 entries with ordinals 0 and 1. A third identical call misses (different version space), runs live, and is written with hashVersion 2 and ordinal 0 in its own `(hashVersion=2, key)` space. Subsequent resumes match all three entries, each under its own version, with zero repays.

### 4.5 Support window, @lurker/compat, JournalCompatibilityError

The engine MUST read and resume entries with hashVersion in the window `[CURRENT-2, CURRENT]`. Older profiles are moved to the `@lurker/compat` package (frozen data plus code, independently versioned, tree-shakeable; the sole lockstep exemption, see 12-release-versioning.md, section "Exemptions") and are enabled ONLY explicitly via `EngineOptions.extraDerivers`. This is the only window extender; the core stays small and embeddable.

```ts
export class JournalCompatibilityError extends LurkerError {
  code: 'journal_compat';           // the closed registry code (02-architecture.md, section "Error taxonomy")
  subCode: 'HASH_VERSION_TOO_OLD' | 'HASH_VERSION_TOO_NEW';
  runId: string;
  entrySeq: number;                 // first violating entry
  entryHashVersion: number;
  supportedRange: { min: HashVersion; max: HashVersion };
  hint: string;                     // 'enable deriverV1 from @lurker/compat' or 'upgrade lurker'
}
```

(Amended during M1-T02: the field previously named `code` here is `subCode`; `code` is reserved for the closed registry code `journal_compat`, whose row in 02-architecture.md already describes these two values as sub-codes. The sub-code also rides `data` in the WireError projection.)

- Outside the window without extraDerivers: typed `JournalCompatibilityError` with subCode `HASH_VERSION_TOO_OLD`.
- An entry from the future (partial downgrade): `HASH_VERSION_TOO_NEW`.
- The check runs as ONE scan immediately after load, strictly BEFORE any live call, any append, and any admission reserve: the refusal is free of side effects.
- In queue mode the check MUST be repeated at lease acquire: a worker with an older library cannot write into a journal containing newer entries (fencing epoch plus version check; section 12.3).

The error taxonomy placement (LurkerError base, code registry, journaling rule) is owned by 02-architecture.md, section "Error taxonomy".

### 4.6 Compatibility lemmas

- Compatibility lemma: the replay predicate is applied with the table of the ENTRY'S OWN version: v1 entries under the round-1 table (ok replays; error and cancelled rerun), v2 entries under the full table of section 6. On the domain of v1 entries (where there is no escalated, no derived skipped, no memoizeOutcome) the two tables coincide, therefore a mixed journal is deterministic.
- Never-pay-twice through upgrade: for any journal whose versions all lie inside the support window, and an unchanged workflow, replay on the new engine performs zero live calls.

### 4.7 Bump discipline

hashVersion MUST be bumped only when identity derivation, replay semantics, or kinds/statuses that an in-window engine could not interpret change. Additive optional telemetry fields do NOT require a bump: unknown fields pass through opaquely (store contract A4, section 12.2). Every bump MUST ship at minimum as a minor release with a compat note, a frozen fixture of the previous profile, and contract tests (12-release-versioning.md, section "hashVersion release discipline").

Offline key migration is impossible in principle (hash preimages are not stored in the journal), so the only honest modes are: match under the entry's version, or a typed refusal. A silent miss with a mass rerun is forbidden by construction.

There is no upward canonization of legacy entries (DEF-5 cross-review ruling): candidate identity is projected DOWN into the profile of the stored entry; `incomparable` means an invisible donor or a plain non-match, never a false match.

### 4.8 Defect cassettes (DEF-6)

Cassette names are test IDs consumed by 09-observability-testing-spec.md (section "Mandatory defect cassette catalog") and 11-testing-strategy.md.

| Cassette | Asserts |
|---|---|
| resume-v1-on-engine-v2 | Frozen round-1 JSONL fixture (agent, step, rand, external, approval; field `v: 1`) resumes on a v2 engine in replay-strict: zero live calls, all entries consumed under the v1 predicate, normalization does not rewrite the store. Shared with DEF-1's v1-journal-on-v2. |
| resume-v1-with-inserted-call | Same journal, workflow with one call inserted mid-body: exactly one live call through FakeAdapter, the new entry carries hashVersion 2 and a correct ordinal, all v1 neighbors forward-match with zero repays. |
| suspended-v1-resolves-on-v2 | Fixture with a v1 suspended awaitExternal; resolveExternal on a v2 engine: superseding append at version 2 by seq, schema validation at consumption, zero repeated LLM calls. |
| reject-version-too-old | Synthetic fixture with hashVersion 0 outside the window: `HASH_VERSION_TOO_OLD`, zero live calls, zero appends, zero reserves; rerun with `deriverV0` in extraDerivers resumes normally. |
| reject-version-from-future | Fixture containing a hashVersion 3 entry on a v2 engine: `HASH_VERSION_TOO_NEW` at load and separately at lease acquire in queue mode; no side effects. |
| effort-defaults-shift | v1 fixture written without effort; v2 config sets role defaults high/low: all v1 entries match, the pricing and ladder-statistics folds read legacy effort as `medium`, new entries carry real effort in identity. |

## 5. JournalEntry form and the kinds registry v2

### 5.1 Entry form

```ts
// Final entry form (hashVersion 2; evolution per section 4)
export type JournalEntry = {
  hashVersion: HashVersion;    // identity-derivation and replay-semantics version of THIS entry
  seq: number;                 // total order per run; canonical EntryRef = seq
  ref?: number;                // backward reference by seq, always ref < seq:
                               //   - on ref-entries (resolution/abandon): seq of the target
                               //   - on terminal phase entries: seq of the running entry
  scope: string; key: string; ordinal: number;
  kind: EntryKind;             // single registry v2, section 5.3
  status: 'running'|'ok'|'error'|'limit'|'suspended'|'cancelled'|'escalated';
  // 'skipped' is DELIBERATELY absent from the stored enum: it is a derived fold status
  value?: Json; error?: WireError; usage?: Usage; usageApprox?: boolean;
  servedBy?: ModelRef; transcriptRef?: string; checkpointRef?: string;
  resolution?: ResolutionPayload;  // only when kind === 'resolution'
  abandon?: AbandonPayload;        // only when kind === 'abandon'
  deadlineAt?: string;             // on suspended entries: the journaled deadline
  spanId: string; startedAt: string; endedAt?: string;
};
```

Carrying `ref` does not make an entry a ref-entry: the ref-entry class is exactly the kinds `resolution` and `abandon`, and only that class is excluded from the scope cursor (section 8.2). `WireError` is the JSON-serializable error projection defined in 02-architecture.md, section "Error taxonomy".

All journaled values MUST be JSON-serializable; a violation raises a typed `NonSerializableValueError` at the call site. `append` is serialized by a per-run queue.

### 5.2 Stored status vocabulary

The stored status vocabulary is exactly: `running`, `ok`, `error`, `limit`, `suspended`, `cancelled`, `escalated`.

- `skipped` is NEVER persisted: it is a derived fold status (and the AgentResult status seen by the consumer) produced by the abandon overlay (DEF-1, DEF-4; sections 6.2 and 9.1).
- `escalated` is legal ONLY on entries of kind `agent`, but in ALL scopes, not only under `plan/NodeId` (DEF-1). The kernel predicate is scope-independent; the difference between scopes lives entirely in the consumer (invariant I5: one runtime, one journal, one budget path).
- Status generation for `escalated` is gated by opt-in: an agent without an escalation config cannot produce it, so pre-existing workflows never see the new status at runtime (DEF-1). The status ships in M3 flagged BREAKING (12-release-versioning.md, section "Pre-1.0 convention"); the predicate row ships in M2.

### 5.3 Kinds registry v2

Round-1 base kinds: `agent`, `step`, `external`, `rand`, `child`, `approval`. Added by rounds 2-3 and the defect fixes:

| Kind | Class | Phases | Legal statuses | Payload summary (normative) | Payload detail |
|---|---|---|---|---|---|
| agent | content-keyed | two-phase | running; ok, error, limit, cancelled, escalated | section 5.4 | this doc |
| step | content-keyed | two-phase | running; ok, error | terminal `value` = JSON result of fn; `error` = WireError on failure | 06-execution-spec.md |
| child | content-keyed | two-phase | running; ok, error, limit, cancelled | terminal `value` = child workflow result | 06-execution-spec.md |
| external | content-keyed | suspended, closed by resolution | suspended | the awaitExternal key; resolved value delivered via the closing resolution; NO deadlineAt in v1 | section 8; 06-execution-spec.md |
| approval | content-keyed | suspended, closed by resolution | suspended | tool-approval request (toolName, input, risk metadata); carries `deadlineAt` | section 8; 08-tools-permissions-spec.md |
| rand | content-keyed | single-phase | ok | `{ subtype: 'now'\|'random'\|'uuid', value }`; bound by (scope, ordinal) within its key space | section 5.4 |
| decision | content-keyed (request part) | single-phase | ok | `decisionType` discriminator plus request/value split (section 1.2) | 07-adaptive-orchestration-spec.md; 05-model-knowledge-spec.md |
| plan.revision | content-keyed (request part) | single-phase | ok | plan surface (DEF-8); the draft kind `plan_revision` is abolished | 07-adaptive-orchestration-spec.md |
| plan.decision | content-keyed (request part) | single-phase | ok | plan surface (DEF-8) | 07-adaptive-orchestration-spec.md |
| ledger.op | content-keyed (request part) | single-phase | ok | authored RunLedger ops; `lesson_add` key MUST be `(logicalTaskId, approachSig)` (DEF-3) | 07-adaptive-orchestration-spec.md |
| resolution | ref-entry | single-phase fact | ok at append | ResolutionPayload (section 8.6) | this doc (DEF-4) |
| abandon | ref-entry | single-phase fact | ok at append | AbandonPayload (section 8.6) | this doc (DEF-4, DEF-5) |
| node.link | content-keyed effect entry | single-phase | ok | NodeLinkEntry (section 9.5); NOT a ref-entry: only the donor is addressed by seq | this doc (DEF-5) |
| termination.init | append fact | single-phase | ok | frozen termination limits vector (DEF-2) | 07-adaptive-orchestration-spec.md |
| termination.denied | append fact | single-phase | ok | denied debit record (DEF-2) | 07-adaptive-orchestration-spec.md |

`decision` payloads carry a `decisionType` field with the closed set: `escalation.decision`, `ladder.verdict`, `spawn-admission`, `orchestrator_budget_reserve`, `orchestrator_budget_cap`, `orchestrator_finalize_fallback`, `kb_pinned`, `kb_repinned`.

Readers MUST tolerate unknown kinds and unknown fields (normative tolerance rule, DEF-5 breaking note; store obligation A4 makes them pass through byte-for-byte).

### 5.4 Normative payload schemas for kernel-owned kinds

Agent entries (two-phase):

- Running phase: identity fields only; no value.
- Terminal phase: `value` = the structured output (or `null`), `usage` (with `usageApprox: true` when the stream was cut), `servedBy`, `transcriptRef`; the transcript itself lives in TranscriptStore, referenced by `transcriptRef`; the derived `costUsd` and `turns` fold from usage and the versioned price table (04-model-layer-spec.md, section "Pricing"). `memoizeOutcome`, when set, MUST be fixed in the entry payload at dispatch time as a policy field; the predicate reads the flag from the ENTRY, not from current code (DEF-1).
- Terminal `escalated` entries additionally carry `escalation: EscalationReport` with fields `{ kind, scopeDelta, revisedEstimate, blockers, proposedDecomposition, costToDate, salvage }`, where `costToDate` and `salvage` are filled by the runtime (never the model), and the report MUST be schema-validated BEFORE append; `usage`, `costUsd`, `turns`, `transcriptRef` are filled as for `ok`; `value` is `null` (DEF-1). The EscalationReport type is owned by 07-adaptive-orchestration-spec.md, section "EscalationProtocol".

Rand entries: `ctx.now`, `ctx.random`, and `ctx.uuid` all journal as kind `rand` with a subtype discriminator, keyed by (scope, ordinal) within their identity key space (ambiguity ruling):

```ts
type RandPayload =
  | { subtype: 'now';    value: number }
  | { subtype: 'random'; value: number; key?: string }
  | { subtype: 'uuid';   value: string };
```

Value size policy: there is NO automatic value offload in v1 (ambiguity ruling). Entries whose serialized `value` exceeds a configurable soft threshold produce a warning event, never an error; the threshold default is listed in 06-execution-spec.md, Appendix A (defaults table). Large artifacts belong in TranscriptStore by reference.

## 6. Replay predicate (DEF-1)

### 6.1 The three kernel amendments

The kernel has exactly THREE amendments relative to the original round-1 rule ("only ok replays; error and cancelled rerun"):

1. `memoizeOutcome` (opt-in flag on spawns): attempts that are task-complete but failed replay instead of rerunning (DEF-1).
2. `abandon` (journaled abandonment): branches dropped by a revision get the derived `skipped` status on replay instead of rerunning live (DEF-4).
3. `escalated`-replays-as-ok: the terminal `escalated` status is treated by the predicate as completed, paid work (DEF-1).

The whole predicate is centralized in the Journal Kernel as the single canonical pure function; no layer above (Agent Runtime, PlanRunner, ModelLadder) may override or duplicate it. The Agent Runtime only PRODUCES statuses. All three amendments MUST be implemented as a single table in the Journal Kernel stage (M2), strictly BEFORE the Agent Runtime stage (M3).

```ts
export type ReplayDisposition = 'replay' | 'rerun' | 'skip';

export interface AbandonFold {
  isAbandoned(ref: number): boolean; // projection of the first-wins fold over kind 'abandon'
                                     // entries (section 8.4)
}

// Public kernel function, NOT a Storage SPI method
export function replayDisposition(entry: JournalEntry, fold: AbandonFold): ReplayDisposition;
```

### 6.2 Step 1: the effective-status fold

At load, one pass in append order builds the AbandonFold: the projection of the first-wins fold of DEF-4 over entries of kind `abandon` (the set of seqs covered directly, or transitively through the child scope-prefix of the target); it is NOT a separate independent pass. If an entry is covered, its effective status is `skipped` regardless of its terminal status (including over `ok` and `escalated`); the payload stays addressable (required by reuse-by-reference, section 9). The AbandonFold is built exactly once at load, in append order, and pinned for the entire resume (DEF-1 ordering rule 4).

### 6.3 Step 2: the disposition table

The full table, including the alias column (DEF-5). "Under incoming alias" means the entry lies under a `node.link` alias mapping (section 9.5); in that case the derived-skipped overlay is bypassed and the entry becomes match-eligible with its pre-abandon terminal status, to which this same table is applied.

| Effective status | Disposition | Conditions and notes | Under incoming node.link alias (DEF-5) |
|---|---|---|---|
| ok | replay | unconditional | replays |
| escalated | replay | unconditional; "replays as ok" means "the predicate treats the entry as completed and paid", NOT a status rewrite: the consumer sees status `escalated` and the byte-identical EscalationReport on replay too | replays as ok |
| skipped (derived) | skip | never rerun; the consumer receives `AgentResult { status: 'skipped', output: null }`, spend increment is zero; the payload stays addressable | alias bypasses the overlay: the pre-abandon terminal status governs (this column's other rows) |
| limit | rerun, unless `memoizeOutcome: true` is fixed IN the entry; then replay | limit is always task-class: the model ran to its cap, the work is paid | same rule, applied to the pre-abandon status |
| error | rerun by default; replay only under the conjunction: `memoizeOutcome: true` fixed IN the entry, AND the transport-vs-task classifier yields task-class | task-class: error kind `schema-mismatch`, `terminal`, non-retryable `tool`; classes `transport`, `rate-limit`, `budget` always rerun, even under memoizeOutcome | reruns live (subject to the same memoizeOutcome conjunction) |
| cancelled | rerun | memoizeOutcome has no effect on cancelled (cancellation is caller intent, not a task outcome); the ONLY path to skip is a journaled abandon | reruns live |
| hanging running | rerun | re-dispatch, at-least-once (section 13.1) | not match-eligible (section 9.11) |
| suspended | outside the table | resolutions are consumed by the first-closing-wins fold (section 8); an unresolved entry stays suspended | not applicable |

A skipped entry WITHOUT an incoming alias is always skipped.

### 6.4 The error classifier

```ts
export type ErrorClass = 'transport' | 'task';
export function classifyAgentError(e: AgentError): ErrorClass;
// task:      kind 'schema-mismatch' | 'terminal' | ('tool' when retryable === false)
// transport (never memoized): kind 'transport' | 'rate-limit' | 'budget'
```

### 6.5 invalidate/retry

A memoized failure comes with an invalidate/retry API for explicit unpinning (the "external API recovered tomorrow" case): invalidating a memoized failed entry makes the next resume rerun it. The exact API surface and its safety boundary are an open question; see 14-open-questions.md (invalidate/retry safety boundary). The mechanism itself is committed.

### 6.6 Version dispatch and policy reads

- The predicate is applied with the table of the ENTRY'S OWN hashVersion: v1 entries under the round-1 table, v2 entries under the full table above; on the v1 domain the tables coincide, so a mixed journal is deterministic (compatibility lemma, section 4.6).
- `memoizeOutcome` is fixed in the entry payload at dispatch time as a policy field (it does NOT enter the content key, exactly like `onError`/`retry`); the predicate reads the flag from the entry, not from current code. Entry identity is untouched: neither status nor policy fields enter the hash; there is no re-keying.
- The status and kind vocabulary change has no versioning mechanism of its own: it rides the entry's `hashVersion` field (the v2 profile) with the single failure type `JournalCompatibilityError`; `JOURNAL_FORMAT_VERSION` and `JournalFormatError` are abolished (DEF-1 cross-review ruling).

### 6.7 Consumer surface

The consumer-visible status vocabulary extends with `escalated` (BREAKING, flagged in the changelog for v0.4.0; see 12-release-versioning.md):

```ts
export type AgentStatus = 'ok' | 'error' | 'limit' | 'cancelled' | 'skipped' | 'escalated';

export interface AgentResult<T> {
  status: AgentStatus;
  output: T | null;
  usage: Usage; costUsd: number; turns: number;
  transcriptRef: string; artifacts?: Artifact[];
  error?: AgentError;
  escalation?: EscalationReport; // if and only if status === 'escalated'
}
export type EscalatedResult<T> = AgentResult<T> & { status: 'escalated'; escalation: EscalationReport };
export function isEscalated<T>(r: AgentResult<T>): r is EscalatedResult<T>;

export interface SpawnOptions {
  memoizeOutcome?: boolean;       // default false; acts only on error/limit, never on cancelled
  escalation?: EscalationOptions; // opt-in; without it the escalated status cannot be produced
  // existing fields unchanged
}
```

Consumption per scope: under `plan/NodeId` the report is routed by PlanRunner into the WakeDigest; in script modes the typed `AgentResult` with status `escalated` is returned to calling code or to the InProcessRunner's onEscalation hook (06-execution-spec.md, section "Script runners"; 07-adaptive-orchestration-spec.md).

### 6.8 Ordering rules for escalation-related entries (DEF-1)

1. The node's terminal `escalated` entry MUST be appended strictly BEFORE the decision entry recording the owner's decision, in the owner's scope.
2. A decision entry MUST be appended strictly BEFORE any of its effects (respawn, decomposition, abandon, scheduling).
3. An `abandon` MUST be appended AFTER its authorizing decision entry and BEFORE scheduling the effects of the same revision.
4. The AbandonFold is built exactly once at load, in append order, and pinned for the whole resume.
5. All derived counters are folds over authoritative entries only, ordered by spawn ordinal; the unit of escalation counting is authoritative escalation-decision entries with `countsAgainstLimit: true`, never terminal `escalated` entries.

Live behavior: the runtime validates the EscalationReport, fills `costToDate`/`salvage` (`salvage.transcriptRef` via TranscriptStore) and appends the terminal entry. Flavor B (the escalate tool) writes a suspended entry on the existing HITL machinery; a timeout is expressed as a resolution entry with `by: 'timeout'` through the ResolutionArbiter (section 8.5), closing the suspended entry with the defaultDecision; dispose and the agent's terminal `escalated` entry are effects strictly after it; an agent is never resumed into a destroyed environment.

Replay behavior: an `escalated` entry forward-matches by content key inside its scope like any completed entry; the runtime synthesizes the AgentResult entirely from the payload (same report, same usage) without a single adapter call; usage/costUsd fold into the budget ledger exactly once; a Flavor B suspended entry with an existing closing resolution is not re-suspended. Entries with effective status `skipped` are not rerun, yield status `skipped` with a zero spend increment, and keep their payload addressable.

### 6.9 Edge cases (DEF-1)

- abandon references an entry with status `escalated` or `ok`: step 1 of the predicate wins: effective status `skipped`, disposition skip. Precedence is fixed: abandon is stronger than any terminal status; the payload is preserved for reuse-by-reference.
- `memoizeOutcome: true` on a spawn that ended with a transport error (429, timeout, stream cut): rerun. Memoization acts only on task-class; otherwise resume would cache transient infrastructure failures as final outcomes.
- `memoizeOutcome: true` on a cancelled entry: rerun. The flag has no effect on cancelled by construction; the only path to skip for a cancelled subtree is a journaled abandon.
- A hanging `running` entry of an escalation-capable agent after a crash: live re-dispatch (at-least-once). No double-counting of escalations: the maxEscalationsPerLogicalTask fold (section 10) counts only authoritative decision entries by lineage.
- Code changed `memoizeOutcome` between runs: the disposition of the old entry is decided by the value fixed in the entry itself; policy fields do not enter the content key, no re-keying occurs.
- An escalated child inside `ctx.parallel` with an onError policy: escalated is not an error: onError does not fire, the branch counts as a settled outcome (like limit). The run outcome set does not grow.
- A race between a live decision and a timeout resolution on a Flavor B suspended entry: both attempts are resolution entries through the ResolutionArbiter; the first in journal order wins (first-wins fold, section 8.4), the loser is classified noop. The predicate sees exactly one closing entry.
- A hashVersion 1 journal on a v2 engine and vice versa: v1 on v2: the v1 vocabulary is a strict subset, the table degenerates to the round-1 predicate, dispositions are byte-identical. v2 on v1: `JournalCompatibilityError` with code `HASH_VERSION_TOO_NEW` at load (section 4.5); silent mis-replay is excluded.

### 6.10 Defect cassettes (DEF-1)

| Cassette | Asserts |
|---|---|
| escalate-replay | Worker finishes escalated with a report, parent decides respawn; replay-strict resume yields zero live calls, the byte-identical EscalationReport, and the same decision from the decision entry. |
| crash-between-report-and-decision | Crash after the terminal escalated entry but before the decision entry; the first resume replays escalated and pays for the decision live exactly once; the second resume replays both entries with zero live calls. |
| abandon-subtree | cancel_task plus abandon over a subtree containing ok, escalated, and a hanging running entry; replay-strict gives all of them effective skipped, zero live calls, zero spend increment. |
| memoize-classifier | Two rung spawns with `memoizeOutcome: true`, the first finished with a task-class error (schema-mismatch), the second transport-class (rate-limit); strict replay replays the first and fails exactly on the second as the expected rerun miss. |
| flavor-b-timeout | The escalate tool suspends the agent, the timeout appends a resolution `by: 'timeout'`, dispose and demotion to terminal escalated follow as effects; resume replays the closing resolution and the terminal entry, defaultDecision applies first-wins, no re-suspension. |
| v1-journal-on-v2 | A journal without the new statuses and kinds resumes on a v2 engine; all dispositions are byte-identical to the round-1 table (regression guard for the scope-independent predicate). |

## 7. Scoped forward-matching

### 7.1 Cursor rules

Matching at resume: each scope has a cursor with forward search; a key match ahead of the cursor means replay. Normative rules:

- A miss does NOT advance the cursor and does NOT extinguish future hits (insertion stability): inserting a new call costs exactly one live call.
- Deleting a call marks its entry orphaned; orphans go to the resume report, they are never charged again.
- Completed neighbors are NEVER repaid; there is no global prefix-flip.
- Ref-entries (`resolution`, `abandon`) are excluded from the scope cursor: they never forward-match, never shift ordinals, and are found during the fold by `ref` (DEF-4, rule O3).

### 7.2 Ordinal rules

`ordinal` is assigned at append as the number of prior entries in the same scope carrying the same `(hashVersion, key)` pair (DEF-6). Matching consumes candidates in journal order; the first unconsumed match wins (this also resolves cross-version double matches deterministically, section 4.4).

### 7.3 Per-call replay modes and opts.key

| Mode | Semantics |
|---|---|
| scoped (default) | forward-matching within the call's scope as above |
| cache | ordinal-aware matching across the WHOLE run: N identical panel calls bind to N distinct entries regardless of scope |
| never | always live; the result is journaled as a new entry |

`opts.key` pins the identity of volatile prompts (section 1.2).

### 7.4 Accepted residual limitation

Two intentionally identical calls swapped with each other inside one scope bind in journal order. This is accepted and documented; the cure is `opts.key` and the lint rule about duplicate identical calls (eslint-plugin-lurker; 06-execution-spec.md, section "Script runners").

## 8. Suspension and resolutions (DEF-4)

No CAS and no entry mutation are introduced into the Storage SPI. Both suspension resolution and abandon are expressed exclusively through appends of new entries plus a pure deterministic fold. JournalStore stays exactly five methods; its contract is tightened normatively but not extended (section 12).

### 8.1 Suspended entries

`awaitExternal(key)`, tool approvals, the escalate tool (Flavor B), and `wait_for_events` write an entry with status `suspended`. A duplicate awaitExternal key in one scope is an immediate typed error.

A suspended entry carries the journaled field `deadlineAt`: deadlines deterministically survive resume. `awaitExternal` has NO deadline in v1; `deadlineAt` applies only to approvals and Flavor B escalations (ambiguity ruling; 06-execution-spec.md, section "Canonical Ctx interface"). At resume, if no closing entry exists and `now > deadlineAt`, a `by: 'timeout'` attempt is immediately submitted to the arbiter; if the deadline has not arrived, the timer is re-armed for the remainder. The fold does not depend on wall-clock: time influences only WHICH attempt appears in the journal; the outcome is determined by journal order.

A process MAY exit with run outcome `suspended`. `resolveExternal` against a live run settles the waiting promise in place without replay; otherwise the resolution is schema-validated at consumption on the next resume. On every resume from suspension the engine writes a fresh `kb_repinned` decision entry (05-model-knowledge-spec.md, section "Read path").

### 8.2 Ref-entries

Two kinds, `resolution` and `abandon`, form the ref-entry family: ref-addressable entries whose `ref` field carries the seq of the target entry, always `ref < seq` (backward only). Ref-entries do NOT participate in forward-matching by the scope cursor: the fold finds them by `ref`, not by content key; their `scope` field duplicates the target's scope for telemetry only. This is the single amendment to the matching model: a class of entries excluded from the cursor appears; all other round-1 identity rules are untouched.

Ref-entries are appended with status `ok` (they are facts, not two-phase operations); their applied/noop/invalid classification is derived by the fold and never stored.

### 8.3 Superseding append

Any attempt to resolve a suspended entry (live resolveExternal, defaultDecision on timeout, class-level EscalationDecision, quiescence wake of wait_for_events, non-HITL engine fallback) IS an append of a `resolution` entry with `ref` on the target. Any branch cancellation by a revision (cancel_task, decomposition, no-progress abort) IS an append of an `abandon` entry with `ref` on the branch's spawn entry and `authorizedBy` pointing at the sanctioning decision entry (`plan.revision` is written strictly BEFORE the abandon).

Losing attempts are ALSO appended: a fired timer and an operator answer are dynamic decisions that happened and MUST be journaled; they become no-ops by fold classification, not by a stored field.

### 8.4 First-closing-wins fold

For each suspended entry S, the closing entry is:

- (a) the first, in journal order, `resolution` with `ref = S.seq` whose payload is valid against the schema pinned by S's schemaHash; or
- (b) the first `abandon` covering S directly or transitively (S lies under the child scope-prefix of the abandon's target).

The first closing entry in seq order wins; all subsequent closing entries are classified by the fold as noop (`already_resolved` or `target_abandoned`). A schema-invalid offline resolution is classified `invalid` and does NOT close S (round-1 behavior preserved: the entry stays suspended, a typed error surfaces at resume).

The applied/noop/invalid classification is NEVER persisted: it is a pure function of the journal and the pinned schemas, therefore any two stores returning the same journal produce a bit-identical outcome. The live kernel duplicates the classification only into telemetry (`resolution:applied` / `resolution:superseded` events; 09-observability-testing-spec.md) and into the resume report.

### 8.5 ResolutionArbiter (in-process serialization)

A per-run kernel component (not a store component) sitting in front of the existing per-run append queue. All resolution/abandon attempts in a live process MUST pass through the arbiter: a per-target FIFO critical section spanning [classification against the in-memory fold state -> durable append of the attempt -> settling the waiting promise exactly once]. The winner's effects (agent continuation, dispose-on-timeout, decomposition spawn through the AdmissionController) are scheduled strictly AFTER leaving the section.

The timer-versus-live race is solved by construction: both enter the FIFO, the first closes, the second is appended and classified noop, the agent's promise settles once. The winner cancels the timer, but an uncancelled timer is also safe.

The cross-process layer is unchanged: LeasableStore fencing epochs remain the only protection against concurrent writers in queue mode. The first-wins fold is the last line of determinism: whatever total order the store persists, the fold yields the same outcome on all stores and all replays. Offline resolution is performed as load, compute next seq, append (under a lease where the store is leasable).

### 8.6 Payloads and the resolution source mapping

```ts
type ResolutionPayload = {
  target: number;                    // duplicates ref for self-description
  by: 'external'|'timeout'|'class_decision'|'operator'|'quiescence'|'engine_fallback';
  value: Json;                       // awaitExternal resolution / EscalationDecision / WakeDigest
  decisionRef?: number;              // seq of the class-level EscalationDecision when by='class_decision'
  logicalTaskId?: LogicalTaskId;     // for lineage-fold attribution (DEF-3)
  countsAgainstLimit?: boolean;      // only on escalation resolutions (DEF-3)
};

type AbandonPayload = {
  target: number;                    // seq of the abandoned branch's spawn entry
  authorizedBy: number;              // seq of the plan.revision or decision entry
  nodeId?: string;
  logicalTaskId?: LogicalTaskId;     // for lineage-fold attribution (DEF-3)
  reason: string;
  retainCheckpoint?: boolean;        // default true (DEF-5)
  retainWorktree?: boolean;          // default false; counts against the park/unpark pin cap (DEF-5;
                                     // 08-tools-permissions-spec.md, maxPinnedWorktrees)
};
```

Normative mapping of every resolution source to its `by` value (ambiguity ruling):

| Resolution source | `by` |
|---|---|
| Programmatic resolveExternal (engine API or the HTTP external endpoint) | external |
| Interactive operator action via CLI/TUI | operator |
| Deadline timer applying defaultDecision at deadlineAt | timeout |
| Class-level EscalationDecision (fans out to matching suspended reports) | class_decision |
| Quiescence wake closing a wait_for_events suspension | quiescence |
| Non-HITL engine fallback | engine_fallback |

There is exactly one legacy kind `abandon` (the round-2 draft type `TaskAbandonEntry` and kind `task.abandon` are abolished, DEF-1 cross-review ruling): target and authorizedBy by seq, transitive coverage of the target's child scope-prefix; the `retainCheckpoint`/`retainWorktree` fields of DEF-5 live in this same entry.

### 8.7 Kernel and public API

```ts
interface Replayer {
  lookup(scope: string, key: string, ordinal: number, mode: 'scoped'|'cache'|'never'): JournalEntry | 'live';
  append(e: NewJournalEntry): Promise<JournalEntry>;
  ledger(): { usage: Usage; usd: number; agentsSpawned: number };
  resolveSuspended(target: number, a: ResolutionAttempt): Promise<ResolutionOutcome>;
  abandonBranch(a: AbandonAttempt): Promise<ResolutionOutcome>;
  suspensionState(target: number): SuspensionState;  // pure fold view, snapshot-pinned
}

type ResolutionAttempt = { by: ResolutionPayload['by']; value: Json; decisionRef?: number };
type AbandonAttempt = { target: number; authorizedBy: number; nodeId?: string; reason: string };

type ResolutionOutcome =
  | { applied: true;  seq: number }
  | { applied: false; seq: number; supersededBy: number; reason: 'already_resolved'|'target_abandoned' };

type SuspensionState =
  | { state: 'suspended'; deadlineAt?: string }
  | { state: 'resolved';  by: number; value: Json }
  | { state: 'abandoned'; by: number };

// Internal, not public: per-run FIFO serializer of attempts per target.
interface ResolutionArbiter {
  submit(target: number, attempt: ResolutionAttempt | AbandonAttempt): Promise<ResolutionOutcome>;
}

// Public API signature change (BREAKING versus round 1):
// was: resolveExternal(runId, key, value): Promise<void>
resolveExternal(runId: string, key: string, value: Json): Promise<ResolutionOutcome>;
// The live path validates value against the schema BEFORE append and throws a typed
// InvalidResolutionError without journaling anything; an offline append is validated by the fold.
```

### 8.8 Ordering rules

- O1 (extension of decision-before-effects): a resolution IS the decision entry for the resumption point; all its effects happen strictly after the durable append. An abandon is written strictly AFTER its sanctioning decision entry (`authorizedBy < seq` of the abandon) and strictly BEFORE any cancellation effects.
- O2 backward references only: `ref < seq`. A forward ref or a ref to a nonexistent seq is a `JournalOrderViolation`, a hard typed load error.
- O3 ref-entries are excluded from the scope cursor: they never forward-match, never shift ordinals, and are found during the fold by ref.
- O4 first-closing-wins (section 8.4).
- O5 abandon transitivity: coverage extends to all entries under the child scope-prefix of the target. Abandon over an already-terminal ok entry is allowed: derived skipped for scheduling, the value stays addressable.

### 8.9 Live versus replay

Live: all attempts go through the ResolutionArbiter; losers receive a ResolutionOutcome with `applied: false`; effects execute only for the winner; telemetry never enters identity.

Replay: the fold reconstructs classifications in one pass by seq; closed suspended entries yield the winner's value without waiting; noop and invalid entries produce no effects and no live calls; derived-skipped entries are not re-dispatched; suspended entries without a closing entry stay suspended (on live resume the timer is re-armed from deadlineAt; under replay-strict the run finishes with outcome `suspended` and zero live calls).

### 8.10 Edge cases (DEF-4)

- The defaultDecision timer fires in the same tick as a live operator resolution in one process: both attempts enter the per-target FIFO; the first closes, the second is classified noop with supersededBy; the agent's promise settles exactly once; effects (including dispose-on-timeout) execute only for the winner; the agent is never resumed into a destroyed environment.
- The first offline resolution is schema-invalid, then a valid one: the fold classifies the first invalid (S stays suspended, a typed error in the resume report), the second applied; the live path cannot create this (validation before append).
- A resolution for a suspended entry inside an already-abandoned subtree: the earlier covering abandon wins; the resolution folds to noop with `target_abandoned`; the caller receives `applied: false`, not an error.
- An abandon points at an already-terminal ok entry: it applies; derived skipped for scheduling and reporting, the ok value stays addressable.
- A ref-entry points forward or at a nonexistent seq: `JournalOrderViolation` (unreachable while single-writer and fencing hold, so the journal is corrupt; the conformance kit catches stores that reorder appends).
- Crash between the durable append of an applied resolution and its effects: normal roll-forward: the decision is recorded before effects, resume sees the closed entry and re-issues the authorized effects, which forward-match; no second resolution is written.
- Two processes offline-resolve one entry on a non-leasable store: a documented violation of the single-writer precondition; nevertheless, whatever total order the store persists, the first-wins fold yields one deterministic outcome; on a LeasableStore the race is excluded by the fencing epoch.
- The quiescence trigger and an event trigger of wait_for_events are ready simultaneously: both are resolution attempts on one suspended entry through the arbiter; the first closes with its coalesced WakeDigest, the second folds to noop; plan_view pins to the winning WakeDigest's snapshot.

### 8.11 Defect cassettes (DEF-4)

| Cassette | Asserts |
|---|---|
| timeout-vs-live-race | A Flavor B escalation is suspended with deadlineAt; the journal records the live EscalationDecision winning and the `by: 'timeout'` attempt landing as noop; replay-strict with zero live calls, noop effects are not re-issued. |
| class-decision-fanout | A class-level EscalationDecision closes three suspended reports, one already closed individually; the journal contains two applied and one noop resolution with decisionRef; the fold state on replay is bit-identical to live. |
| abandon-then-crash-then-resume | plan.revision with cancel_task, then abandon over a running branch with two completed children, crash before effects; resume derives skipped for the whole subtree, zero live calls in it, re-issues only the revision's effects; the resume report lists skipped, not orphaned. |
| abandon-vs-resolution-race | An external resolution arrives after a covering abandon: noop with target_abandoned and `applied: false` for the caller; the reverse order yields an applied resolution and a noop abandon over that entry. |
| offline-invalid-then-valid | Offline append of an invalid resolution, then a valid one; the fold classifies invalid and applied; resume consumes the valid value; replay-strict is deterministic (the schema is pinned by schemaHash). |
| double-abandon-idempotent | Two consecutive revisions cancel overlapping subtrees; the second abandon over an already-covered target folds to noop; materialized state is identical live and replayed, nothing is paid twice. |

## 9. Abandon, derived skipped, and reuse-by-reference (DEF-5)

Oscillation (cancel followed by a byte-identical re-add) no longer means full repayment of the subtree: completed work under an abandoned scope comes back by reference, partially completed work is grafted through a scope-prefix alias, and both outcomes are fixed by a journaled `node.link` entry written strictly before effects.

### 9.1 Abandon and derived skipped

The status `skipped` is never persisted: it is a derived fold status. An abandon targeting T derives skipped for T and transitively for all entries whose scope lies under T's child scope-prefix. Derived-skipped entries are NOT re-dispatched at resume (unlike cancelled) and appear in the resume report as skipped, not orphaned. The underlying entry is immutable: abandon over an already-terminal ok entry is allowed and the value stays addressable (the seam for reuse-by-reference). Repeated abandons over the same target, or inside an already-abandoned subtree, fold to noop.

### 9.2 SpawnKey

There is no new hash concept: the SpawnKey of a candidate equals the kernel contentHash of the spawn's root entry, that is, sha256 of the canonical JSON of `{kind, agentType, requested modelSpec (including canonical effort and, for laddered spawns, the declared ladder with startTier), prompt (or opts.key), schemaHash, toolsetHash, isolation}` (section 1). Matching is strict SpawnKey equality: no semantic similarity, no fuzzy matching. Dedup remains cheap catching of byte-identical repeats; the real cycle barriers remain depth, quota, and budget. What is new is only that the behavior on a match is DEFINED.

```ts
export type SpawnKey = string; // equals the kernel contentHash of the spawn root entry
```

### 9.3 DedupIndex and donor rules

The DedupIndex is a pure fold over the journal, computed against the fold HEAD at the moment the revision is applied under the PlanWriteLock (07-adaptive-orchestration-spec.md, section "PlanRunner"), not against the WakeDigest base snapshot (the base serves validation only).

The index maps SpawnKey to a list of donor candidates: spawn root entries of ANY origin and ANY nesting depth that satisfy ALL of:

1. Their scope is covered by a severing entry (an `abandon`; `cancel_task` compiles into abandon).
2. The effective status of the root BEFORE the abandon overlay is not `error` (memoized failures are excluded: re-adding a failure means retry intent and belongs to the invalidate/retry API, section 6.5).
3. They are not already captured exclusively by an earlier `node.link` (first-wins in journal order).

Live and done nodes NOT covered by a severing entry are NOT donors: repeating an identical call against an active node is legitimate and is served by the kernel's ordinary ordinal semantics; silent aliasing of active work is forbidden.

### 9.4 Admission verdicts on a SpawnKey match

Exactly four outcomes, computed once live and embedded into the deciding entry (`plan.revision`, escalation decision, or spawn decision); replay never re-evaluates:

| Verdict | Condition | Consequence |
|---|---|---|
| reuse_full | donor root's effective status (pre-overlay) is ok or escalated | zero live budget reserve; structural checks apply to the new node's position; the link is shareable |
| admit_graft | donor was severed in flight and has at least one completed paid entry, and the graft is safe: always for isolation none/readonly; for isolation worktree only with a pinned tree (`retainWorktree` in the abandon entry, under the same pin cap as park; 08-tools-permissions-spec.md) | full standard reserve, no discount (reclaim is a realizable saving, not a prepayment); the capture is exclusive |
| admit (fresh) | donor has zero paid entries, or the graft is unsafe with a non-terminal root | a DedupNote is embedded for telemetry |
| reject, code osc_guard | the oscillation counter for this SpawnKey reached maxOscillationsPerKey (default 2) | PlanRunner raises a typed plan_revise error; the non-HITL RevisionGuards fallback chain engages; the engine never kills the run |

The unified AdmitVerdict union (with `reuse_full` extended to carry `spawnUnitsAfter` and `lineage`) is owned by 07-adaptive-orchestration-spec.md, section "AdmissionController".

### 9.5 node.link and scope-prefix aliasing

`node.link` at graft establishes a scope-prefix rewrite: `donorScopePrefix` maps to `targetScopePrefix` for forward-matching purposes. The kernel's per-scope cursors work unchanged at every nested level, so partial subtree reuse falls out for free at any depth: completed parallel siblings inside the grafted subtree replay through the alias, the severed sibling reruns live, and the first unmatched call is an ordinary kernel insertion costing one live call.

The skipped overlay from abandon is bypassed ONLY through the alias: entries regain their pre-abandon terminal status for matching in the NEW scope; the standalone old scope stays skipped and never replays by itself (alias column, section 6.3).

The agent boots from the donor's retained turn-boundary checkpoint when one exists, otherwise it is reconstructed by re-folding through the matched entries; a partially executed turn after the last checkpoint is repaid live, bounded by one turn (the same bound as budget overshoot).

```ts
export interface NodeLinkEntry {
  kind: 'node.link';
  scope: ScopePath;                 // scope of the decider (parent or orchestrator)
  targetNodeId: NodeId;
  targetScope: ScopePath;           // plan/NewNodeId
  donorScope: ScopePath;            // plan/HeadNodeId
  chain: ScopePath[];               // full chain for transitive drainage
  spawnKey: SpawnKey;
  logicalTaskId: LogicalTaskId;
  mode: 'full' | 'graft';
  claim: 'shared' | 'exclusive';    // full is shareable, graft is exclusive
  checkpointRef?: string;
  reclaimedUsdAtLink: number;
  hashVersion: number;              // section 4
}
```

`node.link` is NOT a ref-entry (cross-review ruling): it is an ordinary forward-matched content-keyed effect entry; only the donor is addressed by seq. Its identity is `(deciding scope, sha256 of {kind: 'node.link', spawnKey, donorScope, targetNodeId}, ordinal within scope)`; `targetNodeId` is deterministic on replay because NodeIds (ULIDs) are assigned inside `plan.revision`.

### 9.6 Chains

If a grafted node is itself abandoned and the key is added again, the new link points at the HEAD of the chain, and the new scope's cursor drains the whole chain transitively, oldest member first, in journal order. Chain length is bounded by maxOscillationsPerKey. A linked node inherits the donor's logicalTaskId (a byte-identical specification IS the same logical task), so escalation counters, stall counters, and lessons are counted by lineage across rebirths and are not reset by re-adoption (DEF-3).

### 9.7 Oscillation accounting: the abandoned-spend ledger

The abandoned-spend ledger extends to a fold over revision, abandon, and link entries:

```ts
export interface AbandonedSpendView { // pure fold, available in plan_view and WakeDigest
  abandonedUsd: number;
  reclaimedUsd: number;               // sum of reclaimedUsdAtLink over all link entries:
                                      // full = the whole chain's payment; graft = the sum of
                                      // match-eligible payments at link time, deterministically
                                      // computed at verdict time
  netLostUsd: number;                 // abandonedUsd - reclaimedUsd
  byKey: Record<SpawnKey, { oscillationCount: number; abandonedUsd: number; reclaimedUsd: number }>;
}
```

The metric is visible in the WakeDigest (within the deterministic renderBudgetTokens measure; open question, 14-open-questions.md) and in the event stream (`node:linked`, `guard:oscillation`; 09-observability-testing-spec.md): the orchestrator SEES that it received a result by reference and can consciously re-execute via `add_task` with `fresh: true`. RevisionGuards gain an optional trigger on a netLostUsd cap (a fraction of the starting budget) with the same terminating fallback (07-adaptive-orchestration-spec.md).

### 9.8 Budget rules

Money spent once is counted once: ancestor totals do not change at link time; the linked node's sub-account reports `inheritedUsd` and `liveUsd` separately. Reclaim NEVER replenishes budget reserves, the revision budget, or the oscillation counter (termination safety, DEF-2; 07-adaptive-orchestration-spec.md, section "TerminationAccount"). The three-layer budget is untouched.

### 9.9 Boundaries and opt-out

- Current run only: cross-run donors are rejected together with cross-run memory (EXC registry, 01-requirements.md).
- Byte identity only.
- Opt-out: `reuse.enabled: false` on the admission config, and `fresh: true` on a specific add_task; both decisions are embedded into the deciding entry and replayed.

```ts
export interface AdmissionConfig {
  // existing maxDepth, maxChildrenPerNode, childBudgetFraction, maxTotalSpawns unchanged
  reuse?: {
    enabled?: boolean;                   // default true
    allowGraft?: boolean;                // default true
    maxOscillationsPerKey?: number;      // default 2
    maxAbandonedNetUsdFraction?: number; // optional RevisionGuards trigger on netLostUsd
  };
}
export interface AddTaskOpDelta { fresh?: boolean } // default false; true forbids reuse for this add

export interface AbandonOptions {
  reason: string;
  retainCheckpoint?: boolean;  // default true
  retainWorktree?: boolean;    // default false; counts against the park/unpark pin cap
}

export interface DonorRef {
  nodeId: NodeId;               // head of the link chain
  rootEntryRef: number;         // seq of the donor's root entry
  chain: NodeId[];              // transitive chain, oldest first
  spawnKey: SpawnKey;
  logicalTaskId: LogicalTaskId; // lineage, section 10
  paidUsd: number;              // paid under the chain at verdict snapshot
}
export interface GraftBoot {
  checkpointRef?: TranscriptCheckpointRef; // when retained by the abandon
  eligiblePaidUsd: number;                 // deterministic sum of match-eligible payments
  worktreePinned: boolean;
}
export interface DedupNote {      // telemetry for a match without reuse
  spawnKey: SpawnKey;
  donorNodeId: NodeId;
  reason: 'donor_failed' | 'no_paid_entries' | 'graft_unsafe' | 'donor_active';
}
export interface AgentResultMeta {
  reusedFrom?: { nodeId: NodeId; rootEntryRef: number; mode: 'full' | 'graft'; reclaimedUsd: number };
}
```

### 9.10 Write order and crash recovery

The write order is mandatory: first the durable append of the deciding entry with the embedded verdict, then `node.link`, then the child's root entry, and only then scheduling of the new scope. A crash at any point between them is an ordinary roll-forward.

Root entry of a linked node: under `full` it is written immediately terminal with status `ok` and payload `{ byRef: donorRootEntryRef }`, zero usage, `inheritedUsd` in the sub-account; under `graft` a normal two-phase running entry is written and the scope activates with the alias.

Live versus replay: the DedupIndex folds at the head under the PlanWriteLock, the verdict is computed once and embedded, the link is durably appended, exclusive captures resolve first-wins in journal order. On replay: verdicts are READ from deciding entries and never re-evaluated against the live budget; link entries match by their own identity; the alias map is rebuilt by fold; `reclaimedUsdAtLink` and oscillationCount fold to identical values because every fold input is a journal fact in journal order, not wall-clock. Under replay-strict any live call on the donor frontier fails the cassette.

### 9.11 Edge cases (DEF-5)

- The donor has a `running` or `cancelled` entry at severing time (flight interrupted mid-turn): not match-eligible even under the alias; the frontier stops at the last completed turn, the partial turn is repaid live (bounded by one turn per agent).
- One revision adds two byte-identical tasks with one SpawnKey: deterministic op order in the PlanOp list: the first add_task gets the exclusive graft capture (or the shareable full link), the second a fresh admit; first-wins in journal order gives the identical outcome on replay.
- Donor with isolation worktree, tree not pinned or destroyed: graft is rejected with DedupNote `graft_unsafe` (silent resume against a fresh tree is impossible, the park rule); `reuse_full` remains allowed: the RESULT (patch, artifacts) is reusable by reference without the environment.
- Re-add with an amended prompt (amend-like rebirth): the SpawnKey differs, dedup misses by construction: the mechanism is byte-identical and does not pretend to be semantic; lineage counters still live through logicalTaskId when the deciding entry declares parent lineage (section 10).
- Donor with `memoizeOutcome: true` and terminal `error` (a memoized failure): excluded from both reuse_full and graft: re-adding a failure means retry intent; fresh admit with DedupNote `donor_failed`; unpinning the failure stays with the invalidate/retry API.
- Donor with terminal status `escalated`: reuse_full returns the same EscalationReport for free (escalated replays as ok); the linked node inherits the logicalTaskId, so maxEscalationsPerLogicalTask counts through the chain: re-adoption does not reset the counter and does not open an escalation storm.
- The world changed between abandon and re-add and the orchestrator expects fresh execution: the default stays reuse (paid work is not repaid), but conscious re-execution is available: `fresh: true` forces a miss; a result-by-reference is always visible through `meta.reusedFrom` and `node:linked` in the WakeDigest; contradictions with the RunLedger world-delta index are flagged, never hidden.
- A run suspended on hash-v1 resumes on a hash-v2 engine: there is NO upward canonization of legacy entries (hash preimages are not stored); the candidate's identity is projected DOWN into the hashVersion profile of the donor entry (project plus deriveKey of that version); `incomparable` means an invisible donor and a fresh admit; the effort default applies only in the fold layer and never enters matching identity; a wrong link is excluded.

### 9.12 Defect cassettes (DEF-5)

| Cassette | Asserts |
|---|---|
| oscillation-full-reuse | Branch driven to done children, cancel_task, byte-identical re-add; verdict reuse_full embedded in plan.revision, node.link and the by-ref root entry present, zero live calls for the reused subtree, replay-strict passes, reclaimedUsd equals the donor's payment. |
| graft-partial-subtree | A node with parallel siblings abandoned when two of three are done; re-add of the identical spec; completed siblings forward-match through the alias, the severed one reruns live exactly once; abandoned-spend shows reclaimedUsd equal to the matched prefix payment. |
| crash-between-link-and-root | Injected crash after the durable node.link append, before the child root entry; resume rolls forward: the link matches, the root entry is re-issued, zero double payment. |
| oscillation-guard-trip | Third re-add of the same SpawnKey with maxOscillationsPerKey 2: reject osc_guard, typed plan_revise error, non-HITL RevisionGuards fallback; the verdict is embedded, replay takes the same path. |
| worktree-disposed-degrade | Donor with isolation worktree, tree not retained: verdict admit with DedupNote graft_unsafe; a separate cassette section checks that reuse_full is still allowed for the same donor with a terminal ok root. |
| claim-exclusivity-and-chain | One revision adds two identical tasks (first grafts, second fresh), then the grafted node is abandoned and added a third time: link to the chain head and transitive drainage oldest-first; first-wins is deterministic, drainage order is identical live and replay-strict, oscillationCount for the key equals 2. |

## 10. Lineage (DEF-3)

One construct is committed: LogicalTaskId (LTID), a ULID minted by the ENGINE (never the model) exactly inside the decision entry that authorizes the spawn, and inherited by explicit journaled rules. LTID answers "is this the same logical task across rebirths"; NodeId remains the plan-node identity; the content key remains the identity of the paid call.

### 10.1 Minting and inheritance rules

| # | Trigger | Rule | relation |
|---|---|---|---|
| 1 | add_task without a lineage block | mints a fresh LTID | first |
| 2 | add_task with `lineage.continues` plus a mandatory `causeRef` (seq of the journal entry that caused the rebirth: an escalation decision with verdict retry, a no-progress abort, a verify-failed verdict) | continues the parent's LTID | respawn |
| 3 | amend_task | NEVER changes the LTID: the LTID is immutable for a NodeId from add_task onward | n/a |
| 4 | each ModelLadder rung attempt | inherits the node's LTID; causeRef points at the journaled trigger verdict | rung-retry |
| 5 | unpark that restarts the agent (destroyed worktree) | is an attempt | unpark-restart |
| 6 | decomposition children | receive FRESH LTIDs with an `ancestry` field (the chain of parent LTIDs, length bounded by maxDepth); the decomposition itself consumes the PARENT LTID's escalation counter | decompose-child |
| 7 | reuse-by-reference (section 9) | the link entry continues the OLD LTID | n/a (carried by node.link) |

Critical constraint: the LTID does NOT enter the content key of the child agent scope; kernel entry identity is untouched, never-pay-twice is unaffected; lineage lives exclusively in decision-entry payloads.

### 10.2 approachSig

Normalization by excluding prose:

- `approachSigCoarse = sha256(JCS({ sigVersion, agentType, toolsetHash, schemaHash, isolation }))`
- `approachSig = sha256(JCS({ sigVersion, coarse, approachTag }))`

where `approachTag` is a slug supplied by the orchestrator in the `approach` field at spawn. Normalization: NFC, lowercase, collapse runs of non-alphanumerics into a hyphen, truncate to 32 characters; an empty value canonicalizes to `default`. Prompt prose does NOT enter the signature at all: rephrasings collide by construction, not by heuristic. The coarse signature feeds the stall detector and the oscillation guard; the full signature keys lessons. When `PlanRunnerOptions.approachVocabulary` is set, a tag outside the vocabulary is rejected with a typed tool error and a bounded re-prompt (never run death).

### 10.3 Types

```ts
export type LogicalTaskId = string; // ULID, minted by the engine
export type LineageRelation = 'first' | 'respawn' | 'rung-retry' | 'decompose-child' | 'unpark-restart';

export interface LineageRef {
  logicalTaskId: LogicalTaskId;
  relation: LineageRelation;
  attemptOrdinal: number;          // 0-based, journal order, not wall-clock
  causeRef?: EntryRef;             // seq; mandatory for every relation except 'first'
  ancestry: LogicalTaskId[];       // decomposition chain, length <= maxDepth
  approachSig: string;             // sha256 hex
  approachSigCoarse: string;       // sha256 hex
  sigVersion: 1;
}

export type AttemptOutcomeClass =
  | 'ok' | 'escalated' | 'task-error' | 'transient-error'
  | 'no-progress' | 'verify-failed' | 'limit' | 'abandoned';

export interface LineageStats {    // pure fold, exposed in plan_view and WakeDigest
  attemptsUsed: number;
  escalationsUsed: number;
  stallStreak: number;
  approaches: Array<{ approachSig: string; approachTag: string; attempts: number; lastOutcome: AttemptOutcomeClass }>;
}

// SpawnOptions delta (ctx.agent, ctx.workflow, spawn_agent, TaskSpec in add_task)
export interface SpawnLineageOpt {
  continues: LogicalTaskId;
  relation?: Exclude<LineageRelation, 'first'>; // default 'respawn'
  causeRef: EntryRef;
}
export interface SpawnOptionsDelta {
  lineage?: SpawnLineageOpt;  // absence means a new root
  approach?: string;          // slug up to 32 chars, normalized by the engine
}
export type AddTaskOp = { op: 'add_task'; spec: TaskSpec; lineage?: SpawnLineageOpt; approach?: string };

export interface EscalationLimits {
  maxEscalationsPerLogicalTask: number; // renamed from maxEscalationsPerNode
  maxAttemptsPerLogicalTask: number;    // default 8, monotonically consumed
}
export interface PlanRunnerOptionsDelta { approachVocabulary?: string[] }

// AdmissionController: input extension; verdicts per the unified union in
// 07-adaptive-orchestration-spec.md
export interface AdmissionRequestDelta {
  lineage: LineageRef;        // computed by the engine before admit
  statsBefore: LineageStats;  // fold at admit time, embedded into the decision entry
}

// Pure signature functions (engine)
export function approachSigCoarse(s: { agentType: string; toolsetHash: string; schemaHash: string; isolation: string }): string;
export function approachSigOf(coarse: string, tag?: string): string;
export function normalizeApproachTag(raw?: string): string;

// RunLedger: the lesson key becomes mandatory
export interface LessonAddOp { op: 'lesson_add'; key: { logicalTaskId: LogicalTaskId; approachSig: string }; text: string }
```

### 10.4 Counter folds

All counters are pure folds over the journal:

- `attemptsUsed(J, ltid)`: counts spawn-authorizing decision entries carrying this LTID.
- `escalationsUsed(J, ltid)`: counts authoritative escalation-decision entries with `countsAgainstLimit: true` (kinds `scope_different` and `blocked_with_evidence` receive false, computed live once and embedded into the entry).
- `stallStreak(J, ltid)`: the length of the maximal suffix of attempts, in attemptOrdinal order, whose outcomes lie in {task-error, no-progress, verify-failed, limit}; transient and environment classes are skipped (they neither lengthen nor break the suffix); ok resets to zero; escalated is neutral.
- Lessons in the RunLedger are keyed by the pair `(logicalTaskId, approachSig)`.

The escalationsUsed and attemptsUsed folds also read `logicalTaskId` from resolution and abandon entries (section 8.6) after their extension with that field (cross-review ruling). Lineage folds count only WINNING (applied) entries under the first-wins fold; noop and invalid entries never count.

### 10.5 Enforcement and the single-live-attempt invariant

`AdmissionController.admit()` computes the folds live STRICTLY BEFORE appending the decision entry, and the verdict together with `statsBefore` is embedded INTO the entry. Exhaustion yields the embedded verdict `lineage_exhausted` with a non-HITL terminating fallback. Single-live-attempt invariant: at most one running attempt per LTID; a competing admit receives `lineage_busy`. Limits (`maxEscalationsPerLogicalTask`, `maxAttemptsPerLogicalTask`, default 8) are consumed monotonically and are NEVER replenished, including across amend and tier changes.

### 10.6 Journal semantics

No new top-level kinds. A mandatory lineage block is added to the payloads of the three spawn-authorizing decision subtypes and one ledger.op kind:

1. `plan.revision`: every added node carries a LineageRef; respawn requires causeRef, otherwise the node is a root.
2. `escalation.decision`: carries the LineageRef of the escalated attempt, the `countsAgainstLimit` flag, embedded `statsBefore`, and on verdict decompose the full list of child LTIDs with ancestry.
3. `ladder.verdict`: carries the LineageRef of the next rung attempt.
4. `ledger.op` of kind lesson_add: a key that matches no journaled attempt of that LTID is rejected.

Request/value split inside decision entries (also section 1.2): the hashed request part holds what was PROPOSED (the PlanOp diff, `lineage.continues`, relation, causeRef, the raw approach tag); the value part, reused on replay, holds what was COMPUTED (new NodeIds and LTIDs, the normalized approachTag, approachSig/approachSigCoarse with sigVersion, statsBefore, countsAgainstLimit, admit verdicts and budget reserves).

Ordering: the durable append of the decision entry with LTIDs already assigned happens strictly BEFORE creating or scheduling any authorized scope; attemptOrdinal is determined by journal order among the spawn-authorizing entries of one LTID; enforcement folds are computed at append time, read folds are pinned to the wake snapshot; under competing resolutions the first-wins fold of section 8 applies: the losing entry is classified noop and does not enter the counters.

Replay: decision entries forward-match by the request part; embedded values are READ, never recomputed: the verdicts `lineage_exhausted`, `lineage_busy`, and `countsAgainstLimit` replay byte-for-byte; a fold recomputation over the same prefix runs only as an integrity assert. The kernel replay predicate is NOT extended: lineage adds no statuses and no matching rules, only payload data.

### 10.7 Legacy canonization

A legacy journal without lineage blocks on a newer engine canonicalizes through the hashVersion mechanism (section 4): every legacy spawn receives the deterministic LTID `'legacy:' + contentHash` of the entry, relation `first`; minting random ULIDs on replay is FORBIDDEN. `sigVersion` inside LineageRef rides the same versioning mechanism; mixed sigVersions in one lineage render as distinct approach families and are flagged.

### 10.8 Edge cases (DEF-3)

- amend_task changes the child's content key: the LTID is immutable from add_task; amend by itself is not an attempt. An attempt appears only with a spawn-authorizing decision entry; amending a not-yet-started node does not increment attemptsUsed; a respawn after amend increments by exactly one.
- RetryPolicy retries and provider failover under the journal: not lineage attempts. Retried-then-successful is one journal entry, hence one attempt; transient and environment classes are additionally excluded from stallStreak.
- Parallel double respawn of one LTID: the single-live-attempt invariant; admit for an LTID with a running attempt returns `lineage_busy`; under competing resolutions the first in journal order wins, the loser folds to noop and does not consume the counter.
- Oscillation of cancel plus byte-identical re-add: reuse-by-reference continues the old LTID through the link entry. An honest new add_task without causeRef mints a root, but the oscillation guard keys on approachSigCoarse ACROSS LTID boundaries: a content-identical rebirth under a new root is still flagged and limited by RevisionGuards.
- Decomposition gives children fresh LTIDs and fresh counters: the decomposition itself consumes the parent's escalationsUsed and admission depth; ancestry is journaled in every child LTID; termination rests on the DEF-2 lemma (07-adaptive-orchestration-spec.md).
- An orchestrator with a stale snapshot proposes a respawn of an LTID whose limit was exhausted after the snapshot: the fold at append time is authoritative, not the snapshot; per the DEF-8 conflict table the op is transformed or dropped with the journaled nop reason `lineage_exhausted`.
- An invalid or foreign approach tag, or a tag outside approachVocabulary: a typed tool error with a bounded re-prompt, not run death; a missing tag canonicalizes to `default`.

### 10.9 Defect cassettes (DEF-3)

| Cassette | Asserts |
|---|---|
| respawn-preserves-counter | Worker escalates twice (kind scope_bigger), the orchestrator respawns the node both times with an amended prompt (new content key, same LTID); the third escalation receives `lineage_exhausted` and a non-HITL fallback; replay-strict reproduces identical verdicts and statsBefore with zero live calls. |
| rung-retry-lineage | A three-rung ladder, verify-failed on the first two; all three attempts share one LTID with attemptOrdinal 0..2; crash after the second rung's verdict; resume forward-matches the first two attempts and pays live only for the third. |
| decompose-mints-children | The decision entry consumes the parent counter and mints three child LTIDs with ancestry inside the value part; replay reads the same ULIDs from the entry and never re-mints. |
| reworded-lessons-collide | Two attempts of one LTID with different prompt prose but identical agentType/toolsetHash/schemaHash and tag 'binary-search'; the engine computes equal approachSigs; lesson_add keys once, plan_view groups the attempts into one approach. |
| stall-streak-classes-and-pinning | The sequence transient-error, task-error, no-progress, ok yields stallStreak 0,1,2,0 in pinned snapshots; a wake turn re-executed after a crash reads exactly the same LineageStats from its snapshot, not a fresh fold. |
| legacy-journal-resume | A journal written before lineage existed resumes; legacy spawns receive deterministic 'legacy:' LTIDs, forward-matching pays nothing, new decision entries are written with sigVersion 1. |

## 11. Checkpoints

### 11.1 Turn-boundary checkpoints

An agent is atomic by default, but with a durable store the runtime MUST write a checkpoint of the canonical history at the boundary of every turn into TranscriptStore: an approval and a crash both continue the loop from the same turn without repaying turns and without re-invoking tools. Between a tool's execution and the checkpoint write, tools are at-least-once; the idempotency recommendation is documented (08-tools-permissions-spec.md). Compaction points are written into the checkpoint. The checkpoint and transcript blob format is engine-internal with a leading format byte for future migration (open question; 14-open-questions.md).

### 11.2 Park/unpark interaction

Park/unpark preserves the child's transcript checkpoint. Worktree-isolated parked nodes either pin the worktree under the cap (`maxPinnedWorktrees`, shared with `retainWorktree`; 08-tools-permissions-spec.md) or unpark restarts the agent: silent resume against a fresh tree is impossible (this is the same rule that gates graft safety, section 9.4).

### 11.3 Resume preview and dry-run

The resume preview is honest: an incremental hit/miss report as replay progresses, plus a dry-run mode that forbids live calls up to the first divergence. Replay-strict (zero live calls; any miss is a typed `JournalMissError`) is specified with the test harness (09-observability-testing-spec.md, section "Test harness three tiers").

## 12. Storage SPI

The storage layer is a dumb byte store. Stores never parse payloads; everything above the kernel knows nothing about persistence. The Storage SPI is one of the six seams frozen at 1.0 (02-architecture.md, section "SPI seams and the 1.0 freeze"). None of the defect fixes added a method: DEF-1, DEF-3, DEF-4, DEF-5, DEF-6 all ride ordinary appends and pure folds.

### 12.1 JournalStore

```ts
interface JournalStore {
  append(runId: string, e: JournalEntry, lease?: Lease): Promise<void>;
  load(runId: string): Promise<JournalEntry[]>;
  putMeta(m: RunMeta): Promise<void>;
  listRuns(f?: RunFilter): Promise<RunMeta[]>;
  delete(runId: string): Promise<void>;
}
```

Exactly five methods; opaque entries. The contract is tightened normatively by DEF-4, without new methods.

### 12.2 Normative store obligations A1-A4 (DEF-4)

| ID | Obligation |
|---|---|
| A1 | Atomicity: a partially written entry is NEVER visible in load. |
| A2 | Total per-run order: load returns exactly the order of successful appends, stable across calls. |
| A3 | Read-your-writes: after an append promise resolves, an immediate load sees the entry. |
| A4 | Opaque payload: unknown kinds and unknown fields pass through byte-for-byte without normalization. |

A store that reorders, deduplicates, or normalizes entries was always incorrect; from M2 it fails explicitly under the conformance kit (declared in release notes as a mandatory adapter migration step).

### 12.3 LeasableStore

```ts
interface LeasableStore extends JournalStore {
  acquire(runId: string, owner: string): Promise<Lease>; // Lease = { runId, owner, epoch }
  renew(l: Lease): Promise<void>;
  release(l: Lease): Promise<void>;
}
```

- `acquire` on a currently held lease MUST reject with a typed `LeaseHeldError` (ambiguity ruling; error registry in 02-architecture.md).
- Leases carry a store-configured TTL; the holder MUST renew at an interval no greater than ttl/3.
- Fencing: a store with leases MUST reject an append carrying a stale epoch, and the rejected entry MUST never appear in load. Split-brain in queue mode is excluded by construction. The fencing epoch is the ONLY cross-process protection; the first-wins fold (section 8.4) is the last line of determinism beneath it.
- The hashVersion compatibility check MUST be repeated at acquire (section 4.5): a worker with an older library cannot write into a journal with newer entries.

### 12.4 TranscriptStore

```ts
interface TranscriptStore {
  put(ref: string, blob: Bytes): Promise<void>;
  get(ref: string): Promise<Bytes | null>;
  list(runId: string): Promise<string[]>;
}
```

TranscriptStore holds transcripts, turn-boundary checkpoints, and worktree patches as separate blobs so the journal stays small and diffable. Blob contents are engine-internal (section 11.1).

### 12.5 RunMeta

```ts
type RunMeta = {
  runId: string; status: RunStatus; name?: string; tags?: string[]; updatedAt: string;
  hashVersionLow?: number; hashVersionHigh?: number;  // advisory, never authoritative
  // Run-to-definition binding (OQ-21 interim rule; contract in
  // 06-execution-spec.md, section "engine.run, engine.resume, and
  // run-to-definition binding"):
  workflowName?: string;       // registered workflow name (in-process Workflow)
  workflowHash?: string;       // content hash of the body or of the compiled source
  workflowSourceRef?: string;  // TranscriptStore ref of the persisted CompiledWorkflow source
};
```

RunMeta is written by the ENGINE via putMeta as a separate record, so `listRuns` requires no payload parsing. The hashVersion range fields are advisory only; the journal is authoritative (section 4.1). The workflow-binding fields are advisory metadata for resume binding and shells, never identity; their persistence home (RunMeta versus TranscriptStore) is the OQ-21 interim rule (14-open-questions.md), and only `workflowSourceRef` points into TranscriptStore. `RunStatus` is defined in 06-execution-spec.md, section "Engine and ops API".

### 12.6 Shipped stores

| Store | Package | Notes |
|---|---|---|
| InMemoryStore | @lurker/core | resume disabled; one-time loud warning |
| JsonlFileStore | @lurker/core | the journal doubles as an event log; ships in M2 |
| SqliteStore | @lurker/store-sqlite | implements LeasableStore with fencing epochs; the reference for community stores (M5) |

### 12.7 Conformance obligations

```ts
// @lurker/store-conformance: executable conformance kit for store adapters
export function journalStoreConformance(mk: () => Promise<JournalStore>): ConformanceSuite;
export function leasableStoreConformance(mk: () => Promise<LeasableStore>): ConformanceSuite;
```

Third-party stores MUST pass the kit. Mandatory checks (see also 11-testing-strategy.md, section "Conformance tier"):

- A1-A4 (section 12.2).
- Fencing: an append with a stale epoch is rejected and does not appear in load.
- Lease contract: acquire on a held lease rejects with the typed `LeaseHeldError`; renew cadence at most ttl/3.
- Golden journal fixture with resolution/noop/invalid/abandon entries: the hash of the materialized fold state MUST be identical to the reference on every store.
- End-to-end decide-once oracle: a scripted race of two attempts, exactly one applied classification, then replay-strict with zero live calls.
- Abandon fixture: resume issues not a single live call inside a skipped subtree (FakeAdapter call counter).

## 13. Two-phase entries, dispatch, and the budget ledger

### 13.1 Two-phase entries and at-least-once dispatch

Dispatched operations (kinds `agent`, `step`, `child`) are two-phase: a `running` entry at dispatch, and a terminal entry referencing the running entry by `ref`. A hanging `running` entry after a crash means re-dispatch: dispatch is at-least-once; reuse of a COMPLETED entry is exactly-once (never-pay-twice, invariant I1). Running/terminal pairs are always single-version (section 4.4): re-dispatching a hanging v1 entry writes a fresh v2 running entry and reports the v1 orphan.

Single-phase kinds (`rand`, ref-entries, the decision family, `node.link`, `termination.*`) are appended once as facts; suspended kinds (`external`, `approval`) are appended once with status `suspended` and closed only by ref-entries (section 8).

### 13.2 Serialization requirements

All journaled values MUST be JSON-serializable; a violation raises a typed `NonSerializableValueError` at the calling site without journaling anything. `append` is serialized by the per-run queue; the ResolutionArbiter sits in front of that queue for resolution/abandon attempts (section 8.5).

### 13.3 Budget ledger fold on resume

- Every terminal entry carries `usage` (`usageApprox: true` when the stream was cut by the budget AbortSignal or a stream failure).
- The budget ledger is folded from the journal at resume: spend is never reset and never double-counted.
- Replayed `escalated` entries fold their usage/costUsd into the ledger exactly once (DEF-1); derived-skipped entries contribute a zero increment; linked (`reuse_full`) entries contribute `inheritedUsd` in the linked node's sub-account without changing ancestor totals (DEF-5).
- Admission reserves are RESTORED from decision entries, never re-estimated (DEF-1).
- Legacy v1 entries without a sub-account attribute their spend to the root budget account through the v1 profile's foldDefaults (DEF-6).
- The `ledger()` accessor on the Replayer exposes the folded totals; the three-layer budget model that consumes them is specified in 06-execution-spec.md, section "Three-layer budget".
