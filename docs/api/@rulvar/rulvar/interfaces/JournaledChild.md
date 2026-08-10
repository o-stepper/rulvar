[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledChild

# Interface: JournaledChild

Defined in: `packages/core/dist/index.d.ts`

One child of one orchestration, as the journal holds it (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | The profile the child ran under, when the terminal recorded it. | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | The RV806 evidence verdict, present under a declared contract. | `packages/core/dist/index.d.ts` |
| `evidence.met` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `evidence.minEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| `evidence.recordedEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | The dispatch seq: the SAME number the orchestrator's own turns used as the child's handle, so a reader can find it in the transcript without a second identifier. Handles are journal-derived and stable across resume (a replayed spawn reports its original dispatch seq), which is what makes this a name and not an index. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status?` | [`EntryStatus`](/api/@rulvar/rulvar/type-aliases/EntryStatus.md) | The status the journal recorded, absent when no terminal followed: the child was still in flight when the journal ends. This is the ENTRY status vocabulary, which is where the run's own dispatch records live. | `packages/core/dist/index.d.ts` |
