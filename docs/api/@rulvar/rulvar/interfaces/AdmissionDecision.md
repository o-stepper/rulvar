[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionDecision

# Interface: AdmissionDecision

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The full admission decision embedded in the carrying entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ladderlength"></a> `ladderLength?` | `number` | The declared ladder length recorded for the termination fold (DEF-2): the replay recomputation reads K_l from the entry, never from the live registry. Present only under a termination account. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-lineage"></a> `lineage?` | [`SpawnLineage`](/api/@rulvar/rulvar/interfaces/SpawnLineage.md) | The computed value-part lineage block (DEF-3): reused byte-exact on replay, never recomputed (docs/03, 10.6). Absent on reject. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | Node identity minted inside the decision (docs/07, section 5); absent on reject. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-statsbefore"></a> `statsBefore` | [`AdmissionStatsBefore`](/api/@rulvar/rulvar/interfaces/AdmissionStatsBefore.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-verdict"></a> `verdict` | [`AdmitVerdict`](/api/@rulvar/rulvar/type-aliases/AdmitVerdict.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
