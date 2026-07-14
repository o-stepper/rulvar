[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpawnLineage

# Interface: SpawnLineage

Defined in: [packages/core/src/journal/lineage.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L62)

The value-part lineage block embedded in decision entries: the computed
LineageRef plus the normalized tag (the request part
holds the RAW proposal; the value part holds what was COMPUTED and is
reused byte-exact on replay).

## Extends

- [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry` | `string`[] | Decomposition chain of parent LTIDs, length <= maxDepth. | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`ancestry`](/api/@rulvar/core/interfaces/LineageRef.md#property-ancestry) | [packages/core/src/journal/lineage.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L50) |
| <a id="property-approachsig"></a> `approachSig` | `string` | - | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`approachSig`](/api/@rulvar/core/interfaces/LineageRef.md#property-approachsig) | [packages/core/src/journal/lineage.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L51) |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse` | `string` | - | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`approachSigCoarse`](/api/@rulvar/core/interfaces/LineageRef.md#property-approachsigcoarse) | [packages/core/src/journal/lineage.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L52) |
| <a id="property-approachtag"></a> `approachTag` | `string` | - | - | [packages/core/src/journal/lineage.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L63) |
| <a id="property-attemptordinal"></a> `attemptOrdinal` | `number` | 0-based, journal order among the LTID's attempts, never wall clock. | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`attemptOrdinal`](/api/@rulvar/core/interfaces/LineageRef.md#property-attemptordinal) | [packages/core/src/journal/lineage.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L46) |
| <a id="property-causeref"></a> `causeRef?` | `number` | Seq of the causing entry; mandatory for every relation except 'first'. | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`causeRef`](/api/@rulvar/core/interfaces/LineageRef.md#property-causeref) | [packages/core/src/journal/lineage.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L48) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`logicalTaskId`](/api/@rulvar/core/interfaces/LineageRef.md#property-logicaltaskid) | [packages/core/src/journal/lineage.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L43) |
| <a id="property-relation"></a> `relation` | [`LineageRelation`](/api/@rulvar/core/type-aliases/LineageRelation.md) | - | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`relation`](/api/@rulvar/core/interfaces/LineageRef.md#property-relation) | [packages/core/src/journal/lineage.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L44) |
| <a id="property-sigversion"></a> `sigVersion` | `1` | - | [`LineageRef`](/api/@rulvar/core/interfaces/LineageRef.md).[`sigVersion`](/api/@rulvar/core/interfaces/LineageRef.md#property-sigversion) | [packages/core/src/journal/lineage.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L53) |
