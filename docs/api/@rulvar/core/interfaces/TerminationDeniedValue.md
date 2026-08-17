[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationDeniedValue

# Interface: TerminationDeniedValue

Defined in: [packages/core/src/journal/termination.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L97)

The value payload of a termination.denied entry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-logicaltaskid"></a> `logicalTaskId?` | `string` | - | [packages/core/src/journal/termination.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L99) |
| <a id="property-reasoncode"></a> `reasonCode` | `string` | - | [packages/core/src/journal/termination.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L102) |
| <a id="property-requestedbyref"></a> `requestedByRef?` | `number` | Seq of the calling tool-call or EscalationReport entry. | [packages/core/src/journal/termination.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L101) |
| <a id="property-resource"></a> `resource` | [`TerminationResource`](/api/@rulvar/core/type-aliases/TerminationResource.md) | - | [packages/core/src/journal/termination.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L98) |
| <a id="property-snapshotafter"></a> `snapshotAfter` | [`TerminationAccountSnapshot`](/api/@rulvar/core/interfaces/TerminationAccountSnapshot.md) | - | [packages/core/src/journal/termination.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L103) |
