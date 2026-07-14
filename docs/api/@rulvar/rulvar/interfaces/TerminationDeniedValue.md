[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminationDeniedValue

# Interface: TerminationDeniedValue

Defined in: `packages/core/dist/index.d.ts`

The value payload of a termination.denied entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reasoncode"></a> `reasonCode` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-requestedbyref"></a> `requestedByRef?` | `number` | Seq of the calling tool-call or EscalationReport entry. | `packages/core/dist/index.d.ts` |
| <a id="property-resource"></a> `resource` | [`TerminationResource`](/api/@rulvar/rulvar/type-aliases/TerminationResource.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-snapshotafter"></a> `snapshotAfter` | [`TerminationAccountSnapshot`](/api/@rulvar/rulvar/interfaces/TerminationAccountSnapshot.md) | - | `packages/core/dist/index.d.ts` |
