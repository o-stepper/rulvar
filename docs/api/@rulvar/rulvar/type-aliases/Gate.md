[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Gate

# Type Alias: Gate

```ts
type Gate = 
  | {
  kind: "mechanical";
  profile: string;
}
  | {
  kind: "judge";
  rung: number | ModelRef;
}
  | {
  fraction: number;
  kind: "spot-check";
};
```

Defined in: `packages/core/dist/index.d.ts`

Ladder acceptance gates. Spot-check sibling selection is strictly via
ctx.random, never Math.random.
