[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EnvelopeEncryption

# Interface: EnvelopeEncryption

Defined in: [packages/core/src/l0/encryption.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L227)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-hook"></a> `hook` | [`SerializationHook`](/api/@rulvar/core/interfaces/SerializationHook.md) | Pass as `createEngine({ serialization })`. | [packages/core/src/l0/encryption.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L229) |
| <a id="property-keyid"></a> `keyId` | `string` | The provider's routing id, stamped into every envelope. | [packages/core/src/l0/encryption.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L231) |
| <a id="property-wrappeddatakey"></a> `wrappedDataKey` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) | The CURRENT wrapped data key. Every write stamps it into the envelope, so nothing else must be persisted; it is exposed for hosts that keep a rotation ledger. | [packages/core/src/l0/encryption.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L237) |
