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

Defined in: [packages/core/src/engine/run-handle.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L90)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### cost

```ts
cost: CostReport;
```

Defined in: [packages/core/src/engine/run-handle.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L99)

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: [packages/core/src/engine/run-handle.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L95)

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

Defined in: [packages/core/src/engine/run-handle.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L97)

Suspensions open at settle time (M2).

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

Defined in: [packages/core/src/engine/run-handle.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L98)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/src/engine/run-handle.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L92)
