[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpawnLineage

# Interface: SpawnLineage

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The value-part lineage block embedded in decision entries: the computed
LineageRef plus the normalized tag (docs/03, 10.6: the request part
holds the RAW proposal; the value part holds what was COMPUTED and is
reused byte-exact on replay).

## Extends

- [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ancestry"></a> `ancestry` | `string`[] | Decomposition chain of parent LTIDs, length <= maxDepth. | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`ancestry`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-ancestry) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-approachsig"></a> `approachSig` | `string` | - | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`approachSig`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-approachsig) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-approachsigcoarse"></a> `approachSigCoarse` | `string` | - | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`approachSigCoarse`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-approachsigcoarse) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-approachtag"></a> `approachTag` | `string` | - | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-attemptordinal"></a> `attemptOrdinal` | `number` | 0-based, journal order among the LTID's attempts, never wall clock. | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`attemptOrdinal`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-attemptordinal) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-causeref"></a> `causeRef?` | `number` | Seq of the causing entry; mandatory for every relation except 'first'. | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`causeRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-causeref) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`logicalTaskId`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-logicaltaskid) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-relation"></a> `relation` | [`LineageRelation`](/api/@rulvar/rulvar/type-aliases/LineageRelation.md) | - | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`relation`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-relation) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| <a id="property-sigversion"></a> `sigVersion` | `1` | - | [`LineageRef`](/api/@rulvar/rulvar/interfaces/LineageRef.md).[`sigVersion`](/api/@rulvar/rulvar/interfaces/LineageRef.md#property-sigversion) | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
