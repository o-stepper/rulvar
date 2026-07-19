[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SuspendedAppend

# Interface: SuspendedAppend

Defined in: [packages/core/src/journal/replayer.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L89)

## Extends

- `BaseAppend`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | - | - | [packages/core/src/journal/replayer.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L90) |
| <a id="property-key"></a> `key` | `string` | - | `BaseAppend.key` | [packages/core/src/journal/replayer.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L75) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | `BaseAppend.kind` | [packages/core/src/journal/replayer.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L76) |
| <a id="property-scope"></a> `scope` | `string` | - | `BaseAppend.scope` | [packages/core/src/journal/replayer.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L74) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | `BaseAppend.site` | [packages/core/src/journal/replayer.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L79) |
| <a id="property-spanid"></a> `spanId` | `string` | - | `BaseAppend.spanId` | [packages/core/src/journal/replayer.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L77) |
| <a id="property-value"></a> `value?` | `unknown` | - | - | [packages/core/src/journal/replayer.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L91) |
