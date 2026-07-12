[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournalCompatibilityError

# Class: JournalCompatibilityError

Defined in: `packages/core/dist/index.d.ts`

Refusal to open a journal whose hashVersion falls outside the engine's
support window (producers ship in M2).
The registry code is 'journal_compat'; the sub-codes live on
`subCode` and in `data`.

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new JournalCompatibilityError(message, detail): JournalCompatibilityError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `detail` | \{ `entryHashVersion`: `number`; `entrySeq`: `number`; `hint`: `string`; `runId`: `string`; `subCode`: [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md); `supportedRange`: \{ `max`: `number`; `min`: `number`; \}; \} |
| `detail.entryHashVersion` | `number` |
| `detail.entrySeq` | `number` |
| `detail.hint` | `string` |
| `detail.runId` | `string` |
| `detail.subCode` | [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md) |
| `detail.supportedRange` | \{ `max`: `number`; `min`: `number`; \} |
| `detail.supportedRange.max` | `number` |
| `detail.supportedRange.min` | `number` |

#### Returns

`JournalCompatibilityError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"journal_compat"` | `"journal_compat"` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-entryhashversion"></a> `entryHashVersion` | `readonly` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-entryseq"></a> `entrySeq` | `readonly` | `number` | `undefined` | Seq of the first violating entry. | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-hint"></a> `hint` | `readonly` | `string` | `undefined` | 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-subcode"></a> `subCode` | `readonly` | [`JournalCompatSubCode`](/api/@rulvar/rulvar/type-aliases/JournalCompatSubCode.md) | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-supportedrange"></a> `supportedRange` | `readonly` | \{ `max`: `number`; `min`: `number`; \} | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| `supportedRange.max` | `public` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| `supportedRange.min` | `public` | `number` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`toWire`](/api/@rulvar/rulvar/classes/RulvarError.md#towire)
