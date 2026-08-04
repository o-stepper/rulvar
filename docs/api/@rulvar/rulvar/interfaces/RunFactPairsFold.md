[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunFactPairsFold

# Interface: RunFactPairsFold

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-pairs"></a> `pairs` | [`ClaimPair`](/api/@rulvar/rulvar/interfaces/ClaimPair.md)[] | The pairs, in draft order, capped at `max`; anchor [RUN\_FACTS\_ANCHOR](/api/@rulvar/rulvar/variables/RUN_FACTS_ANCHOR.md). | `packages/core/dist/index.d.ts` |
| <a id="property-truncated"></a> `truncated` | `boolean` | True when more sentences matched than `max` allowed to report. | `packages/core/dist/index.d.ts` |
