[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DonorRef

# Interface: DonorRef

Defined in: [packages/core/src/journal/reuse.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L33)

The rich donor descriptor embedded in reuse verdicts (docs/03, 9.9).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Transitive chain, oldest first. | [packages/core/src/journal/reuse.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L39) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | Lineage continues through the link (docs/03, 9.6; DEF-3). | [packages/core/src/journal/reuse.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L42) |
| <a id="property-nodeid"></a> `nodeId` | `string` | Head of the link chain. | [packages/core/src/journal/reuse.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L35) |
| <a id="property-paidusd"></a> `paidUsd` | `number` | Paid under the chain at the verdict snapshot. | [packages/core/src/journal/reuse.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L44) |
| <a id="property-rootentryref"></a> `rootEntryRef` | `number` | Seq of the donor's root entry. | [packages/core/src/journal/reuse.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L37) |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | [packages/core/src/journal/reuse.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L40) |
