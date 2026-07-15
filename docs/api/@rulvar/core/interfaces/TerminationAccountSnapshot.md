[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationAccountSnapshot

# Interface: TerminationAccountSnapshot

Defined in: [packages/core/src/journal/termination.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L67)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-perlineage"></a> `perLineage` | `Record`\&lt;[`LogicalTaskId`](/api/@rulvar/core/type-aliases/LogicalTaskId.md), [`LineageCounters`](/api/@rulvar/core/interfaces/LineageCounters.md)\&gt; | - | [packages/core/src/journal/termination.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L70) |
| <a id="property-phi"></a> `phi` | `number` | The variant function, a pure fold over the journal. | [packages/core/src/journal/termination.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L72) |
| <a id="property-revisionunitsremaining"></a> `revisionUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L68) |
| <a id="property-spawnunitsremaining"></a> `spawnUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L69) |
