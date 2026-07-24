[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / localKeyProvider

# Function: localKeyProvider()

```ts
function localKeyProvider(options): DataKeyProvider;
```

Defined in: `packages/core/dist/index.d.ts`

The local reference DataKeyProvider: the key-encryption key is
HKDF-SHA256(secret, info), data keys are random 32-byte AES keys,
and wrapping is AES-256-GCM under the KEK. `info` partitions one
master secret into unrelated KEKs (tenant-scoped keys: one provider
per tenant with `info: tenantId`); a provider with different
secret or info CANNOT unwrap this provider's keys. For production
KMS, implement the same interface over GenerateDataKey/Decrypt.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `info?`: `string`; `keyId?`: `string`; `secret`: `string` \| [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md); \} |
| `options.info?` | `string` |
| `options.keyId?` | `string` |
| `options.secret` | `string` \| [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

## Returns

[`DataKeyProvider`](/api/@rulvar/rulvar/interfaces/DataKeyProvider.md)
