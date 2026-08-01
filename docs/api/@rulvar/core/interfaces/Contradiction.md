[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Contradiction

# Interface: Contradiction

Defined in: [packages/core/src/orchestrator/contradictions.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L50)

One cited location two children read differently.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-anchor"></a> `anchor` | `string` | The cited location both readings point at, e.g. 'src/retry.ts:33'. | [packages/core/src/orchestrator/contradictions.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L52) |
| <a id="property-claims"></a> `claims` | [`ContradictionClaim`](/api/@rulvar/core/interfaces/ContradictionClaim.md)[] | Every reading of that key at that anchor, in first-seen order. | [packages/core/src/orchestrator/contradictions.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L56) |
| <a id="property-key"></a> `key` | `string` | The key both readings name, e.g. 'attempts'. | [packages/core/src/orchestrator/contradictions.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/contradictions.ts#L54) |
