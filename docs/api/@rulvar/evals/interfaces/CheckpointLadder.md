[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/evals](/api/@rulvar/evals/index.md) / CheckpointLadder

# Interface: CheckpointLadder

Defined in: [packages/evals/src/checkpoint.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L51)

One declared checkpoint ladder: rungs are concrete pool members.

## Extends

- [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)

## Properties

| Property | Type | Overrides | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-name"></a> `name` | `string` | [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md).[`name`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md#property-name) | [packages/evals/src/checkpoint.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L52) |
| <a id="property-rungs"></a> `rungs` | [`SweepModel`](/api/@rulvar/evals/interfaces/SweepModel.md)[] | [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md).[`rungs`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md#property-rungs) | [packages/evals/src/checkpoint.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L54) |
| <a id="property-starttier"></a> `startTier` | `number` | [`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md).[`startTier`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md#property-starttier) | [packages/evals/src/checkpoint.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/evals/src/checkpoint.ts#L53) |
