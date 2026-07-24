[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BaseAppend

# Interface: BaseAppend

Defined in: [packages/core/src/journal/replayer.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L74)

Fields common to every append through the kernel.

## Extended by

- [`SinglePhaseAppend`](/api/@rulvar/core/interfaces/SinglePhaseAppend.md)
- [`SuspendedAppend`](/api/@rulvar/core/interfaces/SuspendedAppend.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/journal/replayer.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L76) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | [packages/core/src/journal/replayer.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L77) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/journal/replayer.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L75) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | [packages/core/src/journal/replayer.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L80) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/journal/replayer.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L78) |
