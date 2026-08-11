[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SinglePhaseAppend

# Interface: SinglePhaseAppend

Defined in: [packages/core/src/journal/replayer.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L149)

Fields common to every append through the kernel.

## Extends

- [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md).[`key`](/api/@rulvar/core/interfaces/BaseAppend.md#property-key) | [packages/core/src/journal/replayer.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L142) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md).[`kind`](/api/@rulvar/core/interfaces/BaseAppend.md#property-kind) | [packages/core/src/journal/replayer.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L143) |
| <a id="property-scope"></a> `scope` | `string` | - | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md).[`scope`](/api/@rulvar/core/interfaces/BaseAppend.md#property-scope) | [packages/core/src/journal/replayer.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L141) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | - | [packages/core/src/journal/replayer.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L153) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md).[`site`](/api/@rulvar/core/interfaces/BaseAppend.md#property-site) | [packages/core/src/journal/replayer.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L146) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [`BaseAppend`](/api/@rulvar/core/interfaces/BaseAppend.md).[`spanId`](/api/@rulvar/core/interfaces/BaseAppend.md#property-spanid) | [packages/core/src/journal/replayer.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L144) |
| <a id="property-status"></a> `status` | `"ok"` | - | - | [packages/core/src/journal/replayer.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L150) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | - | [packages/core/src/journal/replayer.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L152) |
| <a id="property-value"></a> `value?` | `unknown` | - | - | [packages/core/src/journal/replayer.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L151) |
