[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DataKeyProvider

# Interface: DataKeyProvider

Defined in: [packages/core/src/l0/encryption.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L69)

The KMS seam. `keyId` is a stable routing id stamped into every
envelope (a KMS key ARN or alias, or a local rotation label); the
two methods are the exact shape of KMS GenerateDataKey and Decrypt.
Both are called only inside `createEnvelopeEncryption`.

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-keyid"></a> `keyId` | `readonly` | `string` | [packages/core/src/l0/encryption.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L70) |

## Methods

### generateDataKey()

```ts
generateDataKey(): Promise<{
  plaintext: Bytes;
  wrapped: Bytes;
}>;
```

Defined in: [packages/core/src/l0/encryption.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L71)

#### Returns

`Promise`\<\{
  `plaintext`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md);
  `wrapped`: [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md);
\}\>

***

### unwrapDataKey()

```ts
unwrapDataKey(wrapped): Promise<Bytes>;
```

Defined in: [packages/core/src/l0/encryption.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/encryption.ts#L72)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `wrapped` | [`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md) |

#### Returns

`Promise`\&lt;[`Bytes`](/api/@rulvar/core/type-aliases/Bytes.md)\&gt;
