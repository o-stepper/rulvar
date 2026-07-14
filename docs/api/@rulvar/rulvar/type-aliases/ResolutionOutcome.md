[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionOutcome

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

Defined in: `packages/core/dist/index.d.ts`
