[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / NodeLinkValue

# Interface: NodeLinkValue

Defined in: [packages/core/src/journal/reuse.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L89)

The node.link entry value: an ordinary content-keyed effect entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Full chain for transitive drainage, oldest first. | [packages/core/src/journal/reuse.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L96) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/reuse.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L102) |
| <a id="property-claim"></a> `claim` | `"shared"` \| `"exclusive"` | full is shareable, graft is exclusive. | [packages/core/src/journal/reuse.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L101) |
| <a id="property-donorrootref"></a> `donorRootRef` | `number` | - | [packages/core/src/journal/reuse.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L104) |
| <a id="property-donorscope"></a> `donorScope` | `string` | plan/HeadNodeId (only the donor is addressed by seq elsewhere). | [packages/core/src/journal/reuse.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L94) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/core/src/journal/reuse.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L98) |
| <a id="property-mode"></a> `mode` | `"full"` \| `"graft"` | - | [packages/core/src/journal/reuse.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L99) |
| <a id="property-reclaimedusdatlink"></a> `reclaimedUsdAtLink` | `number` | - | [packages/core/src/journal/reuse.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L103) |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | [packages/core/src/journal/reuse.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L97) |
| <a id="property-targetnodeid"></a> `targetNodeId` | `string` | - | [packages/core/src/journal/reuse.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L90) |
| <a id="property-targetscope"></a> `targetScope` | `string` | plan/NewNodeId. | [packages/core/src/journal/reuse.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L92) |
