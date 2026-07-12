[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WakeTrigger

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

Defined in: [packages/core/src/orchestrator/wake.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/wake.ts#L71)

The closed v1 trigger vocabulary (docs/07 4.8).
