[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionOutcome

# Type Alias: ResolutionOutcome

```ts
type ResolutionOutcome = 
  | {
  applied: true;
  seq: number;
}
  | {
  applied: false;
  reason: "already_resolved" | "target_abandoned";
  seq: number;
  supersededBy: number;
};
```

Defined in: [packages/core/src/journal/resolution.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L38)
