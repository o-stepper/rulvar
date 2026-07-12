[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LineageRelation

# Type Alias: LineageRelation

```ts
type LineageRelation = 
  | "first"
  | "respawn"
  | "rung-retry"
  | "decompose-child"
  | "unpark-restart";
```

Defined in: [packages/core/src/journal/lineage.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L32)

The closed relation vocabulary of the minting and inheritance table.
