[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunOutcome

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

Defined in: [packages/core/src/engine/run-handle.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L47)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### cost

```ts
cost: CostReport;
```

Defined in: [packages/core/src/engine/run-handle.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L56)

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: [packages/core/src/engine/run-handle.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L52)

Pipeline drops and onError:'null' losses; silent losses are forbidden.

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/src/engine/run-handle.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L50)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/src/engine/run-handle.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L54)

Suspensions open at settle time (M2).

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/src/engine/run-handle.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L48)

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/src/engine/run-handle.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L55)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L49)
