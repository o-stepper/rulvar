[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledChild

# Interface: JournaledChild

Defined in: `packages/core/dist/index.d.ts`

One child of one orchestration, as the journal holds it (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | Present and true when the orchestration ABANDONED this child's branch (RV2804): the work happened and the provider billed it, and the run threw the result away. The money layer has separated the two since RV1904 (`grossUsd` keeps abandoned spend, `totalUsd` does not), and this roster presented discarded children exactly like kept ones, so a post-mortem counting "four children settled ok" counted branches the orchestrator had discarded. Absent means NOT ABANDONED, which is decidable here: the fold reads the same first-wins abandon projection the replayer uses, over the same journal, and `handle` is the very seq an abandon entry targets. | `packages/core/dist/index.d.ts` |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the child ran under, when the terminal recorded it. | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | The RV806 evidence verdict, present under a declared contract. | `packages/core/dist/index.d.ts` |
| `evidence.met` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `evidence.minEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidence.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq: the SAME number the orchestrator's own turns used as the child's handle, so a reader can find it in the transcript without a second identifier. Handles are journal-derived and stable across resume (a replayed spawn reports its original dispatch seq), which is what makes this a name and not an index. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status?` | [`EntryStatus`](/api/@rulvar/rulvar/type-aliases/EntryStatus.md) | The status the journal recorded, absent when no terminal followed: the child was still in flight when the journal ends. This is the ENTRY status vocabulary, which is where the run's own dispatch records live. | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudget"></a> `toolBudget?` | \{ `cap?`: `number`; `used`: `number`; \} | The RV3002 durable tool-budget subset, when the terminal journaled it. | `packages/core/dist/index.d.ts` |
| `toolBudget.cap?` | `number` | - | `packages/core/dist/index.d.ts` |
| `toolBudget.used` | `number` | - | `packages/core/dist/index.d.ts` |
