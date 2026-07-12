[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunOutcome

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

## Type Parameters

| Type Parameter |
| ------ |
| `R` |

## Properties

### cost

```ts
cost: CostReport;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### dropped

```ts
dropped: DroppedItem[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### error?

```ts
optional error?: WireError;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### pending

```ts
pending: PendingExternal[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### status

```ts
status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### usage

```ts
usage: Usage;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

***

### value?

```ts
optional value?: R;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)
