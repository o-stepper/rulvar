[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOutcome

# Type Alias: RunOutcome\&lt;R\&gt;

```ts
type RunOutcome<R> = {
  acceptanceChildren?: AcceptanceChildSummary[];
  acceptedArtifactRef?: number;
  belowFloorOkChildren?: string[];
  childrenAtFailure?: ChildrenAtFailure;
  childStatusCounts?: Record<string, number>;
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
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  synthesisSkipped?: boolean | string;
  usage: Usage;
  value?: R;
};
```

Defined in: [packages/core/src/engine/run-handle.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L273)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### acceptanceChildren?

```ts
optional acceptanceChildren?: AcceptanceChildSummary[];
```

Defined in: [packages/core/src/engine/run-handle.ts:413](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L413)

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

Defined in: [packages/core/src/engine/run-handle.ts:376](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L376)

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

Defined in: [packages/core/src/engine/run-handle.ts:400](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L400)

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

Defined in: [packages/core/src/engine/run-handle.ts:434](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L434)

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

Defined in: [packages/core/src/engine/run-handle.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L300)

Settled child statuses by status name, lifted from the same
envelope (or typed error data) when it carries a valid record of
nonnegative integers; the mirror of the `run:end` field. Absent
otherwise.

***

### claimConsistencyMeta?

```ts
optional claimConsistencyMeta?: Record<string, unknown>;
```

Defined in: [packages/core/src/engine/run-handle.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L322)

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

Defined in: [packages/core/src/engine/run-handle.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L335)

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

Defined in: [packages/core/src/engine/run-handle.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L293)

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

Defined in: [packages/core/src/engine/run-handle.ts:440](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L440)

***

### degradedReasons?

```ts
optional degradedReasons?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L310)

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

Defined in: [packages/core/src/engine/run-handle.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L353)

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

Defined in: [packages/core/src/engine/run-handle.ts:436](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L436)

Pipeline drops and onError:'null' losses; silent losses are forbidden.

***

### envelope

```ts
envelope: TerminalEnvelope;
```

Defined in: [packages/core/src/engine/run-handle.ts:450](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L450)

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

Defined in: [packages/core/src/engine/run-handle.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L276)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/src/engine/run-handle.ts:438](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L438)

Suspensions open at settle time (M2).

***

### rejectedFinishCandidates?

```ts
optional rejectedFinishCandidates?: RejectedFinishCandidate[];
```

Defined in: [packages/core/src/engine/run-handle.ts:387](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L387)

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

Defined in: [packages/core/src/engine/run-handle.ts:362](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L362)

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

Defined in: [packages/core/src/engine/run-handle.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L312)

Children accepted by acceptPartialChildren; same lift and posture.

***

### salvagedTerminalOutputChildren?

```ts
optional salvagedTerminalOutputChildren?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:392](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L392)

Children accepted through validated terminal output salvage on
'limit'; same lift and posture.

***

### semanticPasses?

```ts
optional semanticPasses?: SemanticPassesSummary;
```

Defined in: [packages/core/src/engine/run-handle.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L314)

The explicit semantic pass summaries (RV1906); same lift and posture.

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/src/engine/run-handle.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L274)

***

### synthesisSkipped?

```ts
optional synthesisSkipped?: boolean | string;
```

Defined in: [packages/core/src/engine/run-handle.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L337)

The synthesis-skip marker from the same envelope; same lift and posture (RV2203).

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/src/engine/run-handle.ts:439](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L439)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L275)
