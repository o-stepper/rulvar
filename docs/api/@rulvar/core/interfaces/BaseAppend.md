[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BaseAppend

# Interface: BaseAppend

Defined in: [packages/core/src/journal/replayer.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L135)

Fields common to every append through the kernel.

## Extended by

- [`SinglePhaseAppend`](/api/@rulvar/core/interfaces/SinglePhaseAppend.md)
- [`SuspendedAppend`](/api/@rulvar/core/interfaces/SuspendedAppend.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/journal/replayer.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L137) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | [packages/core/src/journal/replayer.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L138) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/journal/replayer.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L136) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | [packages/core/src/journal/replayer.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L141) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/journal/replayer.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L139) |
