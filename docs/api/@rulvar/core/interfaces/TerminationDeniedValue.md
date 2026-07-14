[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationDeniedValue

# Interface: TerminationDeniedValue

Defined in: [packages/core/src/journal/termination.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L82)

The value payload of a termination.denied entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | [packages/core/src/journal/termination.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L84) |
| <a id="property-reasoncode"></a> `reasonCode` | `string` | - | [packages/core/src/journal/termination.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L87) |
| <a id="property-requestedbyref"></a> `requestedByRef?` | `number` | Seq of the calling tool-call or EscalationReport entry. | [packages/core/src/journal/termination.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L86) |
| <a id="property-resource"></a> `resource` | [`TerminationResource`](/api/@rulvar/core/type-aliases/TerminationResource.md) | - | [packages/core/src/journal/termination.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L83) |
| <a id="property-snapshotafter"></a> `snapshotAfter` | [`TerminationAccountSnapshot`](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md) | - | [packages/core/src/journal/termination.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L88) |
