[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunFactPairsFold

# Interface: RunFactPairsFold

Defined in: [packages/core/src/orchestrator/consistency.ts:525](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L525)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-candidates"></a> `candidates` | `number` | The UNCAPPED count of matched run-claim sentences (RV1809): with only `truncated` a consumer knew the bound cut the fold but not by how much, so no run-fact coverage ratio was computable from the meta alone. | [packages/core/src/orchestrator/consistency.ts:536](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L536) |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md)[] | The pairs, in draft order, capped at `max`; anchor [RUN\_FACTS\_ANCHOR](/api/@rulvar/core/variables/RUN_FACTS_ANCHOR.md). | [packages/core/src/orchestrator/consistency.ts:527](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L527) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more sentences matched than `max` allowed to report. | [packages/core/src/orchestrator/consistency.ts:529](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L529) |
