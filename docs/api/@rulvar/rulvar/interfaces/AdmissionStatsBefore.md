[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AdmissionStatsBefore

# Interface: AdmissionStatsBefore

Defined in: `packages/core/dist/index.d.ts`

Live pre-append snapshot embedded in the decision entry (DEF-2/DEF-3).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childrenofparentbefore"></a> `childrenOfParentBefore` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-depth"></a> `depth` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-lineage"></a> `lineage?` | [`LineageStats`](/api/@rulvar/rulvar/interfaces/LineageStats.md) | The LTID's pinned lineage fold at admit time (DEF-3). | `packages/core/dist/index.d.ts` |
| <a id="property-spawnsbefore"></a> `spawnsBefore` | `number` | - | `packages/core/dist/index.d.ts` |
