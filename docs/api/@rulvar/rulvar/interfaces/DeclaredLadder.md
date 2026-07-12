[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DeclaredLadder

# Interface: DeclaredLadder

Defined in: `packages/core/dist/index.d.ts`

One declared ladder of the run, named by its agentType.

## Extended by

- [`CheckpointLadder`](/api/@rulvar/evals/interfaces/CheckpointLadder.md)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-rungs"></a> `rungs` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \}[] | `packages/core/dist/index.d.ts` |
| <a id="property-starttier"></a> `startTier` | `number` | `packages/core/dist/index.d.ts` |
