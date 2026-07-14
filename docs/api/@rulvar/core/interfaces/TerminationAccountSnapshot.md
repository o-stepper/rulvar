[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationAccountSnapshot

# Interface: TerminationAccountSnapshot

Defined in: [packages/core/src/journal/termination.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L62)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-perlineage"></a> `perLineage` | `Record`\&lt;[`LogicalTaskId`](/api/@rulvar/core/type-aliases/LogicalTaskId.md), [`LineageCounters`](/api/@rulvar/core/interfaces/LineageCounters.md)\&gt; | - | [packages/core/src/journal/termination.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L65) |
| <a id="property-phi"></a> `phi` | `number` | The variant function, a pure fold over the journal. | [packages/core/src/journal/termination.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L67) |
| <a id="property-revisionunitsremaining"></a> `revisionUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L63) |
| <a id="property-spawnunitsremaining"></a> `spawnUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L64) |
