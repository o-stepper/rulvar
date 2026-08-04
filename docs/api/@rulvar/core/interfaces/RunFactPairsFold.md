[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunFactPairsFold

# Interface: RunFactPairsFold

Defined in: [packages/core/src/orchestrator/consistency.ts:411](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L411)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/core/interfaces/ClaimPair.md)[] | The pairs, in draft order, capped at `max`; anchor [RUN\_FACTS\_ANCHOR](/api/@rulvar/core/variables/RUN_FACTS_ANCHOR.md). | [packages/core/src/orchestrator/consistency.ts:413](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L413) |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more sentences matched than `max` allowed to report. | [packages/core/src/orchestrator/consistency.ts:415](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/consistency.ts#L415) |
