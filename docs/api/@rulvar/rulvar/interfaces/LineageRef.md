[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / LineageRef

# Interface: LineageRef

Defined in: `packages/core/dist/index.d.ts`

The computed lineage record of one spawn-authorizing decision entry.

## Extended by

- [`SpawnLineage`](/api/@rulvar/rulvar/interfaces/SpawnLineage.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry` | `string`[] | Decomposition chain of parent LTIDs, length <= maxDepth. | `packages/core/dist/index.d.ts` |
| <a id="property-approachsig"></a> `approachSig` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-attemptordinal"></a> `attemptOrdinal` | `number` | 0-based, journal order among the LTID's attempts, never wall clock. | `packages/core/dist/index.d.ts` |
| <a id="property-causeref"></a> `causeRef?` | `number` | Seq of the causing entry; mandatory for every relation except 'first'. | `packages/core/dist/index.d.ts` |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-relation"></a> `relation` | [`LineageRelation`](/api/@rulvar/rulvar/type-aliases/LineageRelation.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-sigversion"></a> `sigVersion` | `1` | - | `packages/core/dist/index.d.ts` |
