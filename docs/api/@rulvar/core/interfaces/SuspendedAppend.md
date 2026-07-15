[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SuspendedAppend

# Interface: SuspendedAppend

Defined in: [packages/core/src/journal/replayer.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L73)

## Extends

- `BaseAppend`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | - | - | [packages/core/src/journal/replayer.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L74) |
| <a id="property-key"></a> `key` | `string` | - | `BaseAppend.key` | [packages/core/src/journal/replayer.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L59) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | `BaseAppend.kind` | [packages/core/src/journal/replayer.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L60) |
| <a id="property-scope"></a> `scope` | `string` | - | `BaseAppend.scope` | [packages/core/src/journal/replayer.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L58) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | `BaseAppend.site` | [packages/core/src/journal/replayer.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L63) |
| <a id="property-spanid"></a> `spanId` | `string` | - | `BaseAppend.spanId` | [packages/core/src/journal/replayer.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L61) |
| <a id="property-value"></a> `value?` | `unknown` | - | - | [packages/core/src/journal/replayer.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L75) |
