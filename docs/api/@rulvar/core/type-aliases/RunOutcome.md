[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOutcome

# Type Alias: RunOutcome\&lt;R\&gt;

```ts
type RunOutcome<R> = {
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

Defined in: [packages/core/src/engine/run-handle.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L90)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### childStatusCounts?

```ts
optional childStatusCounts?: Record<string, number>;
```

Defined in: [packages/core/src/engine/run-handle.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L117)

Settled child statuses by status name, lifted from the same
envelope (or typed error data) when it carries a valid record of
nonnegative integers; the mirror of the `run:end` field. Absent
otherwise.

***

### completion?

```ts
optional completion?: "complete" | "partial" | "rejected";
```

Defined in: [packages/core/src/engine/run-handle.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L110)

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

Defined in: [packages/core/src/engine/run-handle.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L140)

***

### degradedReasons?

```ts
optional degradedReasons?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L127)

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

Defined in: [packages/core/src/engine/run-handle.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L136)

Pipeline drops and onError:'null' losses; silent losses are forbidden.

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/engine/run-handle.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L93)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/src/engine/run-handle.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L138)

Suspensions open at settle time (M2).

***

### salvagedPartialChildren?

```ts
optional salvagedPartialChildren?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L129)

Children accepted by acceptPartialChildren; same lift and posture.

***

### salvagedTerminalOutputChildren?

```ts
optional salvagedTerminalOutputChildren?: string[];
```

Defined in: [packages/core/src/engine/run-handle.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L134)

Children accepted through validated terminal output salvage on
'limit'; same lift and posture.

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/src/engine/run-handle.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L91)

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/src/engine/run-handle.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L139)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L92)
