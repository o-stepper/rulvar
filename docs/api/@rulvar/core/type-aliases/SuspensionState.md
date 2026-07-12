[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SuspensionState

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

Defined in: [packages/core/src/journal/resolution.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L47)
