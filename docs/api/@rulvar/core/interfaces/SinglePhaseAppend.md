[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SinglePhaseAppend

# Interface: SinglePhaseAppend

Defined in: [packages/core/src/journal/replayer.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L67)

## Extends

- `BaseAppend`

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | `BaseAppend.key` | [packages/core/src/journal/replayer.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L60) |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/core/type-aliases/EntryKind.md) | - | `BaseAppend.kind` | [packages/core/src/journal/replayer.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L61) |
| <a id="property-scope"></a> `scope` | `string` | - | `BaseAppend.scope` | [packages/core/src/journal/replayer.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L59) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | - | [packages/core/src/journal/replayer.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L71) |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | `BaseAppend.site` | [packages/core/src/journal/replayer.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L64) |
| <a id="property-spanid"></a> `spanId` | `string` | - | `BaseAppend.spanId` | [packages/core/src/journal/replayer.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L62) |
| <a id="property-status"></a> `status` | `"ok"` | - | - | [packages/core/src/journal/replayer.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L68) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | - | [packages/core/src/journal/replayer.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L70) |
| <a id="property-value"></a> `value?` | `unknown` | - | - | [packages/core/src/journal/replayer.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L69) |
