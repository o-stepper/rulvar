[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / createEnvelopeEncryption

# Function: createEnvelopeEncryption()

```ts
function createEnvelopeEncryption(options): Promise<EnvelopeEncryption>;
```

Defined in: [packages/core/src/l0/encryption.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L244)

Builds the envelope-encryption SerializationHook. All DataKeyProvider
calls happen HERE (the hook itself is synchronous, on in-memory data
keys): a fresh data key is minted and wrapped for this instance, and
every historical wrapped key is unwrapped for the read path.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EnvelopeEncryptionOptions`](/api/@rulvar/core/interfaces/EnvelopeEncryptionOptions.md) |

## Returns

`Promise`\&lt;[`EnvelopeEncryption`](/api/@rulvar/core/interfaces/EnvelopeEncryption.md)\&gt;
