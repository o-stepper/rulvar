[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminationAccountSnapshot

# Interface: TerminationAccountSnapshot

Defined in: [packages/core/src/journal/termination.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L77)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-perlineage"></a> `perLineage` | `Record`\&lt;[`LogicalTaskId`](/api/@rulvar/core/type-aliases/LogicalTaskId.md), [`LineageCounters`](/api/@rulvar/core/interfaces/LineageCounters.md)\&gt; | - | [packages/core/src/journal/termination.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L80) |
| <a id="property-phi"></a> `phi` | `number` | The variant function, a pure fold over the journal. | [packages/core/src/journal/termination.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L82) |
| <a id="property-revisionunitsremaining"></a> `revisionUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L78) |
| <a id="property-spawnunitsremaining"></a> `spawnUnitsRemaining` | `number` | - | [packages/core/src/journal/termination.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L79) |
