[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GateVerdictValue

# Interface: GateVerdictValue

Defined in: [packages/plan/src/ladder.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L108)

One journaled acceptance-gate evaluation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptref"></a> `attemptRef` | `number` | The judged attempt's root dispatch seq. | [packages/plan/src/ladder.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L113) |
| <a id="property-decisiontype"></a> `decisionType` | `"gate-verdict"` | - | [packages/plan/src/ladder.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L109) |
| <a id="property-detail"></a> `detail?` | `string` | - | [packages/plan/src/ladder.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L120) |
| <a id="property-gate"></a> `gate` | `"mechanical"` \| `"judge"` \| `"spot-check"` | - | [packages/plan/src/ladder.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L114) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/plan/src/ladder.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L110) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/plan/src/ladder.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L111) |
| <a id="property-pass"></a> `pass` | `boolean` | - | [packages/plan/src/ladder.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L119) |
| <a id="property-profile"></a> `profile?` | `string` | The registered profile name (mechanical gates). | [packages/plan/src/ladder.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L116) |
| <a id="property-rung"></a> `rung` | `number` | The executing rung of the judged attempt. | [packages/plan/src/ladder.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L118) |
| <a id="property-spotcheck"></a> `spotCheck?` | \{ `draw`: `number`; `fraction`: `number`; `selected`: `boolean`; \} | Spot-check only: the journaled draw and fraction behind `pass`. | [packages/plan/src/ladder.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L122) |
| `spotCheck.draw` | `number` | - | [packages/plan/src/ladder.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L122) |
| `spotCheck.fraction` | `number` | - | [packages/plan/src/ladder.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L122) |
| `spotCheck.selected` | `boolean` | - | [packages/plan/src/ladder.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L122) |
