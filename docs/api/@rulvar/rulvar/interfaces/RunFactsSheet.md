[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunFactsSheet

# Interface: RunFactsSheet

Defined in: `packages/core/dist/index.d.ts`

The run's own recorded execution facts, prepared by the caller
(deterministic sentences plus the trigger vocabularies).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ids"></a> `ids` | readonly `string`[] | Identity triggers: ids the run itself minted (runId, child node ids). | `packages/core/dist/index.d.ts` |
| <a id="property-numbers"></a> `numbers` | readonly `number`[] | Numeric triggers: recorded fact values (counts, totals). | `packages/core/dist/index.d.ts` |
| <a id="property-text"></a> `text` | `string` | Deterministic sentences of the recorded facts. | `packages/core/dist/index.d.ts` |
