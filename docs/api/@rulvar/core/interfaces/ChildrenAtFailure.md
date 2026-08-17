[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildrenAtFailure

# Interface: ChildrenAtFailure

Defined in: [packages/core/src/engine/run-handle.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L215)

The roster facts of a run that died before any acceptance verdict
(RV2602): a fold over the children's own journaled terminals, so an
`exhausted` or failed orchestration still names the work it paid for.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-belowfloorokchildren"></a> `belowFloorOkChildren?` | `string`[] | Children that settled `ok` under a declared evidence contract they did not meet. The acceptance fold names these too, but only after it runs: the fourth parity run's silent worker was `ok` with zero recorded entries and its run never reached acceptance at all. | [packages/core/src/engine/run-handle.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L228) |
| <a id="property-settled"></a> `settled` | `number` | Of those, the ones carrying a terminal at the moment of death. | [packages/core/src/engine/run-handle.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L219) |
| <a id="property-spawned"></a> `spawned` | `number` | Children admitted, whether or not they settled. | [packages/core/src/engine/run-handle.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L217) |
| <a id="property-statuscounts"></a> `statusCounts` | `Record`\&lt;`string`, `number`\&gt; | Their statuses, counted; the same vocabulary a child terminal uses. | [packages/core/src/engine/run-handle.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L221) |
| <a id="property-unsettled"></a> `unsettled?` | `string`[] | Children still running when the run gave up; absent when none were. | [packages/core/src/engine/run-handle.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L230) |
