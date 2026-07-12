[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DonorRef

# Interface: DonorRef

Defined in: [packages/core/src/journal/reuse.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L34)

The rich donor descriptor embedded in reuse verdicts.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Transitive chain, oldest first. | [packages/core/src/journal/reuse.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L40) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | Lineage continues through the link (DEF-3). | [packages/core/src/journal/reuse.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L43) |
| <a id="property-nodeid"></a> `nodeId` | `string` | Head of the link chain. | [packages/core/src/journal/reuse.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L36) |
| <a id="property-paidusd"></a> `paidUsd` | `number` | Paid under the chain at the verdict snapshot. | [packages/core/src/journal/reuse.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L45) |
| <a id="property-rootentryref"></a> `rootEntryRef` | `number` | Seq of the donor's root entry. | [packages/core/src/journal/reuse.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L38) |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | [packages/core/src/journal/reuse.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L41) |
