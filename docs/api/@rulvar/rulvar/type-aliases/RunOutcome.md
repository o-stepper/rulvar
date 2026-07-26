[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunOutcome

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

Defined in: `packages/core/dist/index.d.ts`

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

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

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: `packages/core/dist/index.d.ts`

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

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
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
