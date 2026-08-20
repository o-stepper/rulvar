[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunFactsSheet

# Interface: RunFactsSheet

Defined in: [packages/core/src/orchestrator/consistency.ts:507](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L507)

The run's own recorded execution facts, prepared by the caller
(deterministic sentences plus the trigger vocabularies).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ids"></a> `ids` | readonly `string`[] | Identity triggers: ids the run itself minted (runId, child node ids). | [packages/core/src/orchestrator/consistency.ts:511](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L511) |
| <a id="property-numbers"></a> `numbers` | readonly `number`[] | Numeric triggers: recorded fact values (counts, totals). | [packages/core/src/orchestrator/consistency.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L513) |
| <a id="property-text"></a> `text` | `string` | Deterministic sentences of the recorded facts. | [packages/core/src/orchestrator/consistency.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L509) |
