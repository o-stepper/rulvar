[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DonorCandidate

# Interface: DonorCandidate

Defined in: `packages/core/dist/index.d.ts`

One donor candidate surfaced by the DedupIndex fold.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Scope chain for transitive drainage, oldest first. | `packages/core/dist/index.d.ts` |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-claimedby"></a> `claimedBy?` | `number` | Seq of the exclusive node.link that captured this donor, if any. | `packages/core/dist/index.d.ts` |
| <a id="property-eligiblepaidusd"></a> `eligiblePaidUsd` | `number` | Match-eligible (completed, non-running, non-cancelled) payments. | `packages/core/dist/index.d.ts` |
| <a id="property-haspaidentries"></a> `hasPaidEntries` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-isolationworktree"></a> `isolationWorktree` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-memoizedfailure"></a> `memoizedFailure` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-nodeid"></a> `nodeId?` | `string` | From the abandon payload when the sever named the node. | `packages/core/dist/index.d.ts` |
| <a id="property-paidusd"></a> `paidUsd` | `number` | Total paid under the donor's child coverage at fold time. | `packages/core/dist/index.d.ts` |
| <a id="property-preabandonstatus"></a> `preAbandonStatus` | `"error"` \| `"ok"` \| `"cancelled"` \| `"limit"` \| `"escalated"` \| `"running"` | Effective root status BEFORE the abandon overlay. | `packages/core/dist/index.d.ts` |
| <a id="property-retainedcheckpoint"></a> `retainedCheckpoint` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-rootentryref"></a> `rootEntryRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-rootscope"></a> `rootScope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-worktreepinned"></a> `worktreePinned` | `boolean` | - | `packages/core/dist/index.d.ts` |
