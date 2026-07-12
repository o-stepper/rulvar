[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SuspendedAppend

# Interface: SuspendedAppend

Defined in: [packages/core/src/journal/replayer.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L72)

## Extends

- `BaseAppend`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-deadlineat"></a> `deadlineAt?` | `string` | - | - | [packages/core/src/journal/replayer.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L73) |
| <a id="property-key"></a> `key` | `string` | - | `BaseAppend.key` | [packages/core/src/journal/replayer.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L58) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | `BaseAppend.kind` | [packages/core/src/journal/replayer.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L59) |
| <a id="property-scope"></a> `scope` | `string` | - | `BaseAppend.scope` | [packages/core/src/journal/replayer.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L57) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | `BaseAppend.site` | [packages/core/src/journal/replayer.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L62) |
| <a id="property-spanid"></a> `spanId` | `string` | - | `BaseAppend.spanId` | [packages/core/src/journal/replayer.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L60) |
| <a id="property-value"></a> `value?` | `unknown` | - | - | [packages/core/src/journal/replayer.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L74) |
