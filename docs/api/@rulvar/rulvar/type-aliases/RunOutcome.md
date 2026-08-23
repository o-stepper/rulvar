[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunOutcome

# Type Alias: RunOutcome\&lt;R\&gt;

```ts
type RunOutcome<R> = {
  acceptanceChildren?: AcceptanceChildSummary[];
  acceptedArtifactRef?: number;
  belowFloorOkChildren?: string[];
  childrenAtFailure?: ChildrenAtFailure;
  childStatusCounts?: Record<string, number>;
  citationAuditMeta?: Record<string, unknown>;
  claimConsistencyMeta?: Record<string, unknown>;
  claimContradictions?: Record<string, unknown>[];
  completion?: "complete" | "partial" | "rejected";
  cost: CostReport;
  degradedReasons?: string[];
  deliverableAccepted?: boolean;
  dropped: DroppedItem[];
  envelope: TerminalEnvelope;
  error?: WireError;
  pending: PendingExternal[];
  rejectedFinishCandidates?: RejectedFinishCandidate[];
  resultAvailable?: boolean;
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
  semanticPasses?: SemanticPassesSummary;
  semanticTerminalVerdict?: Record<string, unknown>;
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  synthesisSkipped?: boolean | string;
  usage: Usage;
  value?: R;
};
```

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### acceptanceChildren?

```ts
optional acceptanceChildren?: AcceptanceChildSummary[];
```

Defined in: `packages/core/dist/index.d.ts`

The per-child machine roster of the acceptance fold (RV806), lifted
from the same envelope (or typed error data) under the same
posture: each spawned child with its settled status, the salvage
arm that accepted it (when one did), and the evidence verdict where
the child declared an evidence contract, `waivedBySalvage` marking
a below-floor child a salvage arm accepted anyway. The twelfth
comparison run accepted two below-floor children through salvage
and the outcome showed it only as name lists; this is the machine
verdict. Replay-stable: the roster is journaled inside the single
acceptance decision.

***

### acceptedArtifactRef?

```ts
optional acceptedArtifactRef?: number;
```

Defined in: `packages/core/dist/index.d.ts`

The journal seq of the decision entry that records the acceptance
of the artifact this terminal carries (RV2506); same lift and
posture, absent whenever `deliverableAccepted` is not true. Three
different entries answer to it, which is the point of having one
field: the accepted `orchestrator_finish_validation` decision on
the ordinary path, the `orchestrator_synthesis_skip` decision when
the RV510 gate settled on a valid draft, and the
`orchestrator_synthesis_regressed` decision when the RV2505 floor
handed a failing synthesis back to its draft. Read it with
`rulvar inspect` (or any journal reader) to see WHICH validators
rendered the acceptance and over WHICH draft hash.

***

### belowFloorOkChildren?

```ts
optional belowFloorOkChildren?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

Children that settled 'ok' below their declared evidence floor
(RV1412); same lift and posture. A fact list in both modes: under
the default their shortfall is a degradation note and the verdict
is untouched; under `acceptance.requireEvidenceFloor` they also
counted against the policy.

***

### childrenAtFailure?

```ts
optional childrenAtFailure?: ChildrenAtFailure;
```

Defined in: `packages/core/dist/index.d.ts`

What the children had produced when the run died BEFORE its
acceptance policy ever rendered a verdict (RV2602).

Every other field on this envelope describes a policy's claim, and
a policy that never ran claims nothing: an orchestration whose
coordination loop crosses its ceiling mid-roster settles with
`completion` absent, and until this shipped the terminal said
nothing at all about work that was already paid for, even though
every child terminal was in the journal. Deliberately NOT
`childStatusCounts`: that field is the acceptance fold's number,
and a fold done by no policy must not borrow its name.

Present exactly when children were spawned AND no acceptance
verdict exists, so the two readings never overlap and neither can
be mistaken for the other. Frozen at the moment of death, before
the RV1903 exit barrier settles the stragglers, which is why
`unsettled` can be non-empty: those children had not landed when
the run gave up.

***

### childStatusCounts?

```ts
optional childStatusCounts?: Record<string, number>;
```

Defined in: `packages/core/dist/index.d.ts`

Settled child statuses by status name, lifted from the same
envelope (or typed error data) when it carries a valid record of
nonnegative integers; the mirror of the `run:end` field. Absent
otherwise.

***

### citationAuditMeta?

```ts
optional citationAuditMeta?: Record<string, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

The citation audit meta (`sampled`, `supported`, `partial`,
`unsupported`, `auditedHash`, the per-section split), lifted from
the same envelope or typed error data as the claim meta beside it
(RV4403). The seventh comparison run failed typed with the audit
meta only inside `error.data`, and no outcome, settle or restart
surface carried the one count the failure was ABOUT. Same lift
and posture as `claimConsistencyMeta`.

***

### claimConsistencyMeta?

```ts
optional claimConsistencyMeta?: Record<string, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

The claim-consistency pass meta (`judgeInvoked`, `judgeDeclined`,
the pair counts), lifted from the same envelope or typed error
data (RV2203). The RV2106 mirror run journaled its declined judge
and the error terminal carried null: the truth now rides every
terminal that has it, ok and failed alike.

***

### claimContradictions?

```ts
optional claimContradictions?: Record<string, unknown>[];
```

Defined in: `packages/core/dist/index.d.ts`

The judged contradictions themselves (RV3601), lifted from the
same envelope or typed error data as the meta beside them. RV3304
deliberately kept the details off this surface and let the meta's
`findings` count stand in; the 2026-08-13 comparison run then
failed typed with the findings buried in `error.data` while the
outcome's top level read null beside a null meta, so the details
now ride wherever the meta rides (this outcome, the journaled
settle, `run:end`), the compact terminal envelope alone keeping
the meta only. `[]` is the judge's claim of a clean document;
absence means nothing was judged (RV1209).

***

### completion?

```ts
optional completion?: "complete" | "partial" | "rejected";
```

Defined in: `packages/core/dist/index.d.ts`

The semantic completion lift, mirrored from `run:end` (RV-207 tail;
the 1.65.0 experiment review, P0.5): present when the workflow
reported semantic completion through the completion envelope
contract, an `ok`/`exhausted` run whose result value is an object
carrying a valid `completion` literal, or an `error` run whose typed
error data carries one (the orchestrator acceptance path emits
both). Transport status says whether the run ran; completion says
whether the work is COMPLETE: an accepted degraded run is `status:
'ok'` with `completion: 'partial'`. The engine computes the lift
ONCE and both surfaces spread the same object, so the outcome and
the event can never disagree; a host reads completeness here
without parsing workflow-specific value shapes on the accepted path
or digging typed error data on the rejected one. Absent when the
workflow makes no completion claim.

***

### cost

```ts
cost: CostReport;
```

Defined in: `packages/core/dist/index.d.ts`

***

### degradedReasons?

```ts
optional degradedReasons?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

Per-child degradation notes, lifted from the same envelope (or
typed error data) when it carries a valid string array (the fifth
experiment, cycle 75): the facts the orchestrator acceptance path
has always emitted beside completion, now on the outcome itself so
a host stops digging error.data on the rejected path. An empty
array is the workflow's claim of zero degradation; absence means no
claim was made.

***

### deliverableAccepted?

```ts
optional deliverableAccepted?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Whether the artifact THIS terminal carries was accepted by the
declared finish contract (RV2506), lifted from the same envelope or
typed error data. The one question `status` and `completion` cannot
answer between them: the 1.226.0 comparison run accepted its
children (`completion: 'complete'` was earned by the acceptance
policy over child statuses), then failed its synthesis against the
contract three times and settled carrying nothing the contract ever
accepted, and the scoring harness read `status: 'ok'` and could not
tell. Absent, NEVER false, when no `finishValidation` was declared:
nothing judged anything, and absence means NOT RECORDED (RV1209).
False means a contract was declared and the artifact here did not
pass it, including the case where nothing was ever judged because
the run died first.

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### envelope

```ts
envelope: TerminalEnvelope;
```

Defined in: `packages/core/dist/index.d.ts`

The unified terminal envelope (RV1105): every terminal fact in ONE
shape, assembled once at the settlement chokepoint and shared with
the `run:end` event, so the SDK and the event stream can never
disagree. A RESOLVED outcome always carries `settled: true` inside
it: an unsettled terminal rejects `handle.result` typed instead of
resolving (RV907, RV1009), and its refusing envelope rides the
event alone.

***

### error?

```ts
optional error?: WireError;
```

Defined in: `packages/core/dist/index.d.ts`

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### rejectedFinishCandidates?

```ts
optional rejectedFinishCandidates?: RejectedFinishCandidate[];
```

Defined in: `packages/core/dist/index.d.ts`

Every finish candidate the declared contract did NOT accept, in the
order they were judged (RV2507); same lift and posture. Present
only when there was at least one, so a run that passed first try
keeps its exact terminal. It rides the ok terminal as well as the
failed one: a run that recovered on its second attempt still owes a
post-mortem the first, and the comparison analysis that had to
reconstruct three rejected syntheses from a transcript is the
reason the field exists.

***

### resultAvailable?

```ts
optional resultAvailable?: boolean;
```

Defined in: `packages/core/dist/index.d.ts`

Whether this terminal carries a deliverable to read at all
(RV2506); same lift and posture. False on every enriched failure
(an `error` outcome carries no value by construction) and on an
accepted run whose synthesis resolved to null. Distinct from
`deliverableAccepted`: an unjudged artifact still EXISTS, and a run
with no artifact still has a completion claim.

***

### salvagedPartialChildren?

```ts
optional salvagedPartialChildren?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### salvagedTerminalOutputChildren?

```ts
optional salvagedTerminalOutputChildren?: string[];
```

Defined in: `packages/core/dist/index.d.ts`

Children accepted through validated terminal output salvage on
'limit'; same lift and posture.

***

### semanticPasses?

```ts
optional semanticPasses?: SemanticPassesSummary;
```

Defined in: `packages/core/dist/index.d.ts`

***

### semanticTerminalVerdict?

```ts
optional semanticTerminalVerdict?: Record<string, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

The one-word semantic verdict (RV4209), lifted from the same
envelope or typed error data as the meta beside it: 'clean',
'findings', 'partial', 'vacuous', 'waived', or 'not-judged', with
the counts and the waiver it was folded from
(SemanticTerminalVerdict). One derivation at the orchestrator
chokepoint instead of every consumer re-deriving the verdict from
four fields; `productionAcceptable` is the exported gate over it.
Absent when no claim or citation machinery was configured, and on
every run recorded before it shipped.

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: `packages/core/dist/index.d.ts`

***

### synthesisSkipped?

```ts
optional synthesisSkipped?: boolean | string;
```

Defined in: `packages/core/dist/index.d.ts`

***

### usage

```ts
usage: Usage;
```

Defined in: `packages/core/dist/index.d.ts`

***

### value?

```ts
optional value?: R;
```

Defined in: `packages/core/dist/index.d.ts`
