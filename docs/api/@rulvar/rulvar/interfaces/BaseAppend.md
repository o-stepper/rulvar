[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BaseAppend

# Interface: BaseAppend

Defined in: `packages/core/dist/index.d.ts`

Fields common to every append through the kernel.

## Extended by

- [`SinglePhaseAppend`](/api/@rulvar/rulvar/interfaces/SinglePhaseAppend.md)
- [`SuspendedAppend`](/api/@rulvar/rulvar/interfaces/SuspendedAppend.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-key"></a> `key` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | [`EntryKind`](/api/@rulvar/rulvar/type-aliases/EntryKind.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-scope"></a> `scope` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-site"></a> `site?` | `string` | Call-site label used in NonSerializableValueError messages. | `packages/core/dist/index.d.ts` |
| <a id="property-spanid"></a> `spanId` | `string` | - | `packages/core/dist/index.d.ts` |
