[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SerializationHook

# Interface: SerializationHook

Defined in: [packages/core/src/l0/serialization.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L56)

createEngine({ serialization }): absent means identity, no wrapping.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-journal"></a> `journal?` | [`JournalSerializationHook`](/api/@rulvar/core/interfaces/JournalSerializationHook.md) | [packages/core/src/l0/serialization.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L57) |
| <a id="property-transcripts"></a> `transcripts?` | [`TranscriptSerializationHook`](/api/@rulvar/core/interfaces/TranscriptSerializationHook.md) | [packages/core/src/l0/serialization.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L58) |
