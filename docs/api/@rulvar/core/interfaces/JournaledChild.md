[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledChild

# Interface: JournaledChild

Defined in: [packages/core/src/stores/reconcile.ts:479](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L479)

One child of one orchestration, as the journal holds it (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | Present and true when the orchestration ABANDONED this child's branch (RV2804): the work happened and the provider billed it, and the run threw the result away. The money layer has separated the two since RV1904 (`grossUsd` keeps abandoned spend, `totalUsd` does not), and this roster presented discarded children exactly like kept ones, so a post-mortem counting "four children settled ok" counted branches the orchestrator had discarded. Absent means NOT ABANDONED, which is decidable here: the fold reads the same first-wins abandon projection the replayer uses, over the same journal, and `handle` is the very seq an abandon entry targets. | [packages/core/src/stores/reconcile.ts:514](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L514) |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the child ran under, when the terminal recorded it. | [packages/core/src/stores/reconcile.ts:489](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L489) |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | The RV806 evidence verdict, present under a declared contract. | [packages/core/src/stores/reconcile.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L498) |
| `evidence.met` | `boolean` | - | [packages/core/src/stores/reconcile.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L498) |
| `evidence.minEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L498) |
| `evidence.recordedEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L498) |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq: the SAME number the orchestrator's own turns used as the child's handle, so a reader can find it in the transcript without a second identifier. Handles are journal-derived and stable across resume (a replayed spawn reports its original dispatch seq), which is what makes this a name and not an index. | [packages/core/src/stores/reconcile.ts:487](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L487) |
| <a id="property-status"></a> `status?` | [`EntryStatus`](/api/@rulvar/core/type-aliases/EntryStatus.md) | The status the journal recorded, absent when no terminal followed: the child was still in flight when the journal ends. This is the ENTRY status vocabulary, which is where the run's own dispatch records live. | [packages/core/src/stores/reconcile.ts:496](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L496) |
| <a id="property-toolbudget"></a> `toolBudget?` | \{ `cap?`: `number`; `used`: `number`; \} | The RV3002 durable tool-budget subset, when the terminal journaled it. | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
| `toolBudget.cap?` | `number` | - | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
| `toolBudget.used` | `number` | - | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
