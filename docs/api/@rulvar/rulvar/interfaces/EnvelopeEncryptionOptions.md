[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EnvelopeEncryptionOptions

# Interface: EnvelopeEncryptionOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-historicalwrappedkeys"></a> `historicalWrappedKeys?` | readonly [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md)[] | Wrapped data keys from earlier sessions or rotations that this process must still read. Unwrapped once at creation; an envelope carrying an UNREGISTERED wrapped key fails typed at read, naming this list. | `packages/core/dist/index.d.ts` |
| <a id="property-plaintextreads"></a> `plaintextReads?` | `"reject"` \| `"passthrough"` | What a NON-enveloped stored entry or blob means at read: 'reject' (default, fail closed) or 'passthrough' (explicit migration mode for stores with pre-encryption history). | `packages/core/dist/index.d.ts` |
| <a id="property-provider"></a> `provider` | [`DataKeyProvider`](/api/@rulvar/rulvar/interfaces/DataKeyProvider.md) | - | `packages/core/dist/index.d.ts` |
