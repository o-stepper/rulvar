[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunFactPairsFold

# Interface: RunFactPairsFold

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-candidates"></a> `candidates` | `number` | The UNCAPPED count of matched run-claim sentences (RV1809): with only `truncated` a consumer knew the bound cut the fold but not by how much, so no run-fact coverage ratio was computable from the meta alone. | `packages/core/dist/index.d.ts` |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The pairs, in draft order, capped at `max`; anchor [RUN\_FACTS\_ANCHOR](/api/@rulvar/rulvar/variables/RUN_FACTS_ANCHOR.md). | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more sentences matched than `max` allowed to report. | `packages/core/dist/index.d.ts` |
