[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationDeniedValue

# Interface: TerminationDeniedValue

Defined in: [packages/core/src/journal/termination.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L87)

The value payload of a termination.denied entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | [packages/core/src/journal/termination.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L89) |
| <a id="property-reasoncode"></a> `reasonCode` | `string` | - | [packages/core/src/journal/termination.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L92) |
| <a id="property-requestedbyref"></a> `requestedByRef?` | `number` | Seq of the calling tool-call or EscalationReport entry. | [packages/core/src/journal/termination.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L91) |
| <a id="property-resource"></a> `resource` | [`TerminationResource`](/api/@rulvar/core/type-aliases/TerminationResource.md) | - | [packages/core/src/journal/termination.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L88) |
| <a id="property-snapshotafter"></a> `snapshotAfter` | [`TerminationAccountSnapshot`](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md) | - | [packages/core/src/journal/termination.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L93) |
