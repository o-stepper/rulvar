[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DonorCandidate

# Interface: DonorCandidate

Defined in: [packages/core/src/journal/reuse.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L127)

One donor candidate surfaced by the DedupIndex fold.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-chain"></a> `chain` | `string`[] | Scope chain for transitive drainage, oldest first. | [packages/core/src/journal/reuse.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L149) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/reuse.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L144) |
| <a id="property-claimedby"></a> `claimedBy?` | `number` | Seq of the exclusive node.link that captured this donor, if any. | [packages/core/src/journal/reuse.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L147) |
| <a id="property-eligiblepaidusd"></a> `eligiblePaidUsd` | `number` | Match-eligible (completed, non-running, non-cancelled) payments. | [packages/core/src/journal/reuse.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L140) |
| <a id="property-haspaidentries"></a> `hasPaidEntries` | `boolean` | - | [packages/core/src/journal/reuse.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L141) |
| <a id="property-isolationworktree"></a> `isolationWorktree` | `boolean` | - | [packages/core/src/journal/reuse.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L142) |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | [packages/core/src/journal/reuse.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L133) |
| <a id="property-memoizedfailure"></a> `memoizedFailure` | `boolean` | - | [packages/core/src/journal/reuse.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L136) |
| <a id="property-nodeid"></a> `nodeId?` | `string` | From the abandon payload when the sever named the node. | [packages/core/src/journal/reuse.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L132) |
| <a id="property-paidusd"></a> `paidUsd` | `number` | Total paid under the donor's child coverage at fold time. | [packages/core/src/journal/reuse.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L138) |
| <a id="property-preabandonstatus"></a> `preAbandonStatus` | `"error"` \| `"limit"` \| `"running"` \| `"ok"` \| `"cancelled"` \| `"escalated"` | Effective root status BEFORE the abandon overlay. | [packages/core/src/journal/reuse.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L135) |
| <a id="property-retainedcheckpoint"></a> `retainedCheckpoint` | `boolean` | - | [packages/core/src/journal/reuse.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L145) |
| <a id="property-rootentryref"></a> `rootEntryRef` | `number` | - | [packages/core/src/journal/reuse.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L128) |
| <a id="property-rootscope"></a> `rootScope` | `string` | - | [packages/core/src/journal/reuse.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L129) |
| <a id="property-spawnkey"></a> `spawnKey` | `string` | - | [packages/core/src/journal/reuse.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L130) |
| <a id="property-worktreepinned"></a> `worktreePinned` | `boolean` | - | [packages/core/src/journal/reuse.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L143) |
