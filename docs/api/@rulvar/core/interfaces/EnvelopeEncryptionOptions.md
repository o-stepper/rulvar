[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EnvelopeEncryptionOptions

# Interface: EnvelopeEncryptionOptions

Defined in: [packages/core/src/l0/encryption.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L195)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-historicalwrappedkeys"></a> `historicalWrappedKeys?` | readonly [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)[] | Wrapped data keys from earlier sessions or rotations that this process must still read. Unwrapped once at creation; an envelope carrying an UNREGISTERED wrapped key fails typed at read, naming this list. | [packages/core/src/l0/encryption.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L203) |
| <a id="property-plaintextreads"></a> `plaintextReads?` | `"reject"` \| `"passthrough"` | What a NON-enveloped stored entry or blob means at read: 'reject' (default, fail closed) or 'passthrough' (explicit migration mode for stores with pre-encryption history). | [packages/core/src/l0/encryption.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L209) |
| <a id="property-provider"></a> `provider` | [`DataKeyProvider`](/api/@rulvar/core/interfaces/DataKeyProvider.md) | - | [packages/core/src/l0/encryption.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L196) |
