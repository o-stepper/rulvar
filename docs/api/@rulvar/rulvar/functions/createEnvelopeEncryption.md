[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / createEnvelopeEncryption

# Function: createEnvelopeEncryption()

```ts
function createEnvelopeEncryption(options): Promise<EnvelopeEncryption>;
```

Defined in: `packages/core/dist/index.d.ts`

Builds the envelope-encryption SerializationHook. All DataKeyProvider
calls happen HERE (the hook itself is synchronous, on in-memory data
keys): a fresh data key is minted and wrapped for this instance, and
every historical wrapped key is unwrapped for the read path.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EnvelopeEncryptionOptions`](/api/@rulvar/rulvar/interfaces/EnvelopeEncryptionOptions.md) |

## Returns

`Promise`\&lt;[`EnvelopeEncryption`](/api/@rulvar/rulvar/interfaces/EnvelopeEncryption.md)\&gt;
