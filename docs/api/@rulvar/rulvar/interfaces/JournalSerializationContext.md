[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalSerializationContext

# Interface: JournalSerializationContext

Defined in: `packages/core/dist/index.d.ts`

The run identity the store knows at the append/load boundary but a
bare JournalEntry does not carry (the runId lives in the store key,
not the entry). Passed to the journal hook so a hook can bind stored
bytes to the run they belong to (RV-217 follow-up: the envelope
encryption uses it as associated data, so a ciphertext cannot be
transplanted into another run). Optional in the type so a host hook
written against the original single-argument shape stays valid.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-runid"></a> `runId` | `string` | `packages/core/dist/index.d.ts` |
