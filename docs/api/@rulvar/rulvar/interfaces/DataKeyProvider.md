[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DataKeyProvider

# Interface: DataKeyProvider

Defined in: `packages/core/dist/index.d.ts`

The KMS seam. `keyId` is a stable routing id stamped into every
envelope (a KMS key ARN or alias, or a local rotation label); the
two methods are the exact shape of KMS GenerateDataKey and Decrypt.
Both are called only inside `createEnvelopeEncryption`.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keyid"></a> `keyId` | `readonly` | `string` | `packages/core/dist/index.d.ts` |

## Methods

### generateDataKey()

```ts
generateDataKey(): Promise<{
  plaintext: Bytes;
  wrapped: Bytes;
}>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`Promise`\<\{
  `plaintext`: [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md);
  `wrapped`: [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md);
\}\>

***

### unwrapDataKey()

```ts
unwrapDataKey(wrapped): Promise<Bytes>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wrapped` | [`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;[`Bytes`](/api/@rulvar/rulvar/type-aliases/Bytes.md)\&gt;
