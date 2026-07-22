[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOutcome

# Type Alias: RunOutcome\&lt;R\&gt;

```ts
type RunOutcome<R> = {
  cost: CostReport;
  dropped: DroppedItem[];
  error?: WireError;
  pending: PendingExternal[];
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  usage: Usage;
  value?: R;
};
```

Defined in: [packages/core/src/engine/run-handle.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L63)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### cost

```ts
cost: CostReport;
```

Defined in: [packages/core/src/engine/run-handle.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L72)

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: [packages/core/src/engine/run-handle.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L68)

Pipeline drops and onError:'null' losses; silent losses are forbidden.

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/engine/run-handle.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L66)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/src/engine/run-handle.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L70)

Suspensions open at settle time (M2).

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/src/engine/run-handle.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L64)

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/src/engine/run-handle.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L71)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L65)
