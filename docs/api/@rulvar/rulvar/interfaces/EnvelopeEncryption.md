[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EnvelopeEncryption

# Interface: EnvelopeEncryption

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-hook"></a> `hook` | [`SerializationHook`](/api/@rulvar/rulvar/interfaces/SerializationHook.md) | Pass as `createEngine({ serialization })`. | `packages/core/dist/index.d.ts` |
| <a id="property-keyid"></a> `keyId` | `string` | The provider's routing id, stamped into every envelope. | `packages/core/dist/index.d.ts` |
| <a id="property-wrappeddatakey"></a> `wrappedDataKey` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) | The CURRENT wrapped data key. Every write stamps it into the envelope, so nothing else must be persisted; it is exposed for hosts that keep a rotation ledger. | `packages/core/dist/index.d.ts` |
