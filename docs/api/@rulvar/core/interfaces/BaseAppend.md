[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BaseAppend

# Interface: BaseAppend

Defined in: [packages/core/src/journal/replayer.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L140)

Fields common to every append through the kernel.

## Extended by

- [`SinglePhaseAppend`](/api/@rulvar/core/interfaces/SinglePhaseAppend.md)
- [`SuspendedAppend`](/api/@rulvar/core/interfaces/SuspendedAppend.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/journal/replayer.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L142) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | [packages/core/src/journal/replayer.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L143) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/journal/replayer.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L141) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | [packages/core/src/journal/replayer.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L146) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/journal/replayer.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L144) |
