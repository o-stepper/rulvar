[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Gate

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

Defined in: [packages/core/src/l0/messages.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/messages.ts#L217)

Ladder acceptance gates. Spot-check sibling selection is strictly via
ctx.random, never Math.random.
