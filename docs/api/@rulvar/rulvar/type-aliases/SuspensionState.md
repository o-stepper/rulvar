[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SuspensionState

# Type Alias: SuspensionState

```ts
type SuspensionState = 
  | {
  deadlineAt?: string;
  state: "suspended";
}
  | {
  by: number;
  state: "resolved";
  value: Json;
}
  | {
  by: number;
  state: "abandoned";
};
```

Defined in: `packages/core/dist/index.d.ts`
