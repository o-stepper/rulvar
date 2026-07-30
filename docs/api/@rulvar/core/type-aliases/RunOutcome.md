[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOutcome

# Type Alias: RunOutcome\&lt;R\&gt;

```ts
type RunOutcome<R> = {
  acceptanceChildren?: AcceptanceChildSummary[];
  childStatusCounts?: Record<string, number>;
  completion?: "complete" | "partial" | "rejected";
  cost: CostReport;
  degradedReasons?: string[];
  dropped: DroppedItem[];
  error?: WireError;
  pending: PendingExternal[];
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  usage: Usage;
  value?: R;
};
```

Defined in: [packages/core/src/engine/run-handle.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L110)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### acceptanceChildren?

```ts
optional acceptanceChildren?: AcceptanceChildSummary[];
```

Defined in: [packages/core/src/engine/run-handle.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L167)

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

### childStatusCounts?

```ts
optional childStatusCounts?: Record<string, number>;
```

Defined in: [packages/core/src/engine/run-handle.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L137)

Settled child statuses by status name, lifted from the same
envelope (or typed error data) when it carries a valid record of
nonnegative integers; the mirror of the `run:end` field. Absent
otherwise.

***

### completion?

```ts
optional completion?: "complete" | "partial" | "rejected";
```

Defined in: [packages/core/src/engine/run-handle.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L130)

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

Defined in: [packages/core/src/engine/run-handle.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L173)

***

### degradedReasons?

```ts
optional degradedReasons?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L147)

Per-child degradation notes, lifted from the same envelope (or
typed error data) when it carries a valid string array (the fifth
experiment, cycle 75): the facts the orchestrator acceptance path
has always emitted beside completion, now on the outcome itself so
a host stops digging error.data on the rejected path. An empty
array is the workflow's claim of zero degradation; absence means no
claim was made.

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: [packages/core/src/engine/run-handle.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L169)

Pipeline drops and onError:'null' losses; silent losses are forbidden.

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/engine/run-handle.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L113)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/src/engine/run-handle.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L171)

Suspensions open at settle time (M2).

***

### salvagedPartialChildren?

```ts
optional salvagedPartialChildren?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L149)

Children accepted by acceptPartialChildren; same lift and posture.

***

### salvagedTerminalOutputChildren?

```ts
optional salvagedTerminalOutputChildren?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L154)

Children accepted through validated terminal output salvage on
'limit'; same lift and posture.

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/src/engine/run-handle.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L111)

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/src/engine/run-handle.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L172)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L112)
