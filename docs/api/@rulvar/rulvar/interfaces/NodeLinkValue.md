[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / NodeLinkValue

# Interface: NodeLinkValue

Defined in: `packages/core/dist/index.d.ts`

The node.link entry value: an ordinary content-keyed effect entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Full chain for transitive drainage, oldest first. | `packages/core/dist/index.d.ts` |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-claim"></a> `claim` | `"shared"` \| `"exclusive"` | full is shareable, graft is exclusive. | `packages/core/dist/index.d.ts` |
| <a id="property-donorrootref"></a> `donorRootRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-donorscope"></a> `donorScope` | `string` | plan/HeadNodeId (only the donor is addressed by seq elsewhere). | `packages/core/dist/index.d.ts` |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-mode"></a> `mode` | `"full"` \| `"graft"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reclaimedusdatlink"></a> `reclaimedUsdAtLink` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-targetnodeid"></a> `targetNodeId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-targetscope"></a> `targetScope` | `string` | plan/NewNodeId. | `packages/core/dist/index.d.ts` |
