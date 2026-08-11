[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalCompatibilityError

# Class: JournalCompatibilityError

Defined in: [packages/core/src/l0/errors.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L134)

Refusal to open a journal whose hashVersion falls outside the engine's
support window (producers ship in M2).
The registry code is 'journal_compat'; the sub-codes live on
`subCode` and in `data`.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new JournalCompatibilityError(message, detail): JournalCompatibilityError;
```

Defined in: [packages/core/src/l0/errors.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L145)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `detail` | \{ `entryHashVersion`: `number`; `entrySeq`: `number`; `hint`: `string`; `runId`: `string`; `subCode`: [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md); `supportedRange`: \{ `max`: `number`; `min`: `number`; \}; \} |
| `detail.entryHashVersion` | `number` |
| `detail.entrySeq` | `number` |
| `detail.hint` | `string` |
| `detail.runId` | `string` |
| `detail.subCode` | [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md) |
| `detail.supportedRange` | \{ `max`: `number`; `min`: `number`; \} |
| `detail.supportedRange.max` | `number` |
| `detail.supportedRange.min` | `number` |

#### Returns

`JournalCompatibilityError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"journal_compat"` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L135) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L63) |
| <a id="property-entryhashversion"></a> `entryHashVersion` | `readonly` | `number` | - | - | - | [packages/core/src/l0/errors.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L140) |
| <a id="property-entryseq"></a> `entrySeq` | `readonly` | `number` | Seq of the first violating entry. | - | - | [packages/core/src/l0/errors.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L139) |
| <a id="property-hint"></a> `hint` | `readonly` | `string` | 'enable deriverV1 from @rulvar/compat' or 'upgrade rulvar'. | - | - | [packages/core/src/l0/errors.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L143) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L62) |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | - | - | [packages/core/src/l0/errors.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L137) |
| <a id="property-subcode"></a> `subCode` | `readonly` | [`JournalCompatSubCode`](/api/@rulvar/core/type-aliases/JournalCompatSubCode.md) | - | - | - | [packages/core/src/l0/errors.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L136) |
| <a id="property-supportedrange"></a> `supportedRange` | `readonly` | \{ `max`: `number`; `min`: `number`; \} | - | - | - | [packages/core/src/l0/errors.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L141) |
| `supportedRange.max` | `public` | `number` | - | - | - | [packages/core/src/l0/errors.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L141) |
| `supportedRange.min` | `public` | `number` | - | - | - | [packages/core/src/l0/errors.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L141) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L74)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
