[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EnvelopeEncryptionOptions

# Interface: EnvelopeEncryptionOptions

Defined in: [packages/core/src/l0/encryption.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L240)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-historicalwrappedkeys"></a> `historicalWrappedKeys?` | readonly [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)[] | Wrapped data keys from earlier sessions or rotations that this process must still read. Unwrapped once at creation; an envelope carrying an UNREGISTERED wrapped key fails typed at read, naming this list. | [packages/core/src/l0/encryption.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L248) |
| <a id="property-plaintextreads"></a> `plaintextReads?` | `"reject"` \| `"passthrough"` | What a NON-enveloped stored entry or blob means at read: 'reject' (default, fail closed) or 'passthrough' (explicit migration mode for stores with pre-encryption history). | [packages/core/src/l0/encryption.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L254) |
| <a id="property-provider"></a> `provider` | [`DataKeyProvider`](/api/@rulvar/core/interfaces/DataKeyProvider.md) | - | [packages/core/src/l0/encryption.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L241) |
