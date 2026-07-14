[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LineageRef

# Interface: LineageRef

Defined in: [packages/core/src/journal/lineage.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L42)

The computed lineage record of one spawn-authorizing decision entry.

## Extended by

- [`SpawnLineage`](/api/@rulvar/core/interfaces/SpawnLineage.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry` | `string`[] | Decomposition chain of parent LTIDs, length <= maxDepth. | [packages/core/src/journal/lineage.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L50) |
| <a id="property-approachsig"></a> `approachSig` | `string` | - | [packages/core/src/journal/lineage.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L51) |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse` | `string` | - | [packages/core/src/journal/lineage.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L52) |
| <a id="property-attemptordinal"></a> `attemptOrdinal` | `number` | 0-based, journal order among the LTID's attempts, never wall clock. | [packages/core/src/journal/lineage.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L46) |
| <a id="property-causeref"></a> `causeRef?` | `number` | Seq of the causing entry; mandatory for every relation except 'first'. | [packages/core/src/journal/lineage.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L48) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/journal/lineage.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L43) |
| <a id="property-relation"></a> `relation` | [`LineageRelation`](/api/@rulvar/core/type-aliases/LineageRelation.md) | - | [packages/core/src/journal/lineage.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L44) |
| <a id="property-sigversion"></a> `sigVersion` | `1` | - | [packages/core/src/journal/lineage.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L53) |
