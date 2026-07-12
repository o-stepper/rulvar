[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / WakeTrigger

# Type Alias: WakeTrigger

```ts
type WakeTrigger = 
  | {
  kind: "quiescence";
}
  | {
  handles?: number[];
  kind: "child_terminal";
}
  | {
  kind: "escalation";
}
  | {
  kind: "budget_threshold";
  percent: 50 | 80;
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The closed v1 trigger vocabulary (docs/07 4.8).
