[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / localKeyProvider

# Function: localKeyProvider()

```ts
function localKeyProvider(options): DataKeyProvider;
```

Defined in: [packages/core/src/l0/encryption.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L84)

The local reference DataKeyProvider: the key-encryption key is
HKDF-SHA256(secret, info), data keys are random 32-byte AES keys,
and wrapping is AES-256-GCM under the KEK. `info` partitions one
master secret into unrelated KEKs (tenant-scoped keys: one provider
per tenant with `info: tenantId`); a provider with different
secret or info CANNOT unwrap this provider's keys. For production
KMS, implement the same interface over GenerateDataKey/Decrypt.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | \{ `info?`: `string`; `keyId?`: `string`; `secret`: `string` \| [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md); \} | - |
| `options.info?` | `string` | KEK partition label (e.g. a tenant id); default ''. |
| `options.keyId?` | `string` | Stamped into envelopes; default 'local:v1'. |
| `options.secret` | `string` \| [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) | - |

## Returns

[`DataKeyProvider`](/api/@rulvar/core/interfaces/DataKeyProvider.md)
