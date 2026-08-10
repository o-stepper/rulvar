[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledChild

# Interface: JournaledChild

Defined in: [packages/core/src/stores/reconcile.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L337)

One child of one orchestration, as the journal holds it (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the child ran under, when the terminal recorded it. | [packages/core/src/stores/reconcile.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L347) |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | The RV806 evidence verdict, present under a declared contract. | [packages/core/src/stores/reconcile.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L356) |
| `evidence.met` | `boolean` | - | [packages/core/src/stores/reconcile.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L356) |
| `evidence.minEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L356) |
| `evidence.recordedEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L356) |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq: the SAME number the orchestrator's own turns used as the child's handle, so a reader can find it in the transcript without a second identifier. Handles are journal-derived and stable across resume (a replayed spawn reports its original dispatch seq), which is what makes this a name and not an index. | [packages/core/src/stores/reconcile.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L345) |
| <a id="property-status"></a> `status?` | [`EntryStatus`](/api/@rulvar/core/type-aliases/EntryStatus.md) | The status the journal recorded, absent when no terminal followed: the child was still in flight when the journal ends. This is the ENTRY status vocabulary, which is where the run's own dispatch records live. | [packages/core/src/stores/reconcile.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L354) |
