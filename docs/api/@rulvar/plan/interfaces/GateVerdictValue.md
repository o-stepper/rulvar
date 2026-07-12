[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / GateVerdictValue

# Interface: GateVerdictValue

Defined in: [packages/plan/src/ladder.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L109)

One journaled acceptance-gate evaluation (docs/07, section 10).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attemptref"></a> `attemptRef` | `number` | The judged attempt's root dispatch seq. | [packages/plan/src/ladder.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L114) |
| <a id="property-decisiontype"></a> `decisionType` | `"gate-verdict"` | - | [packages/plan/src/ladder.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L110) |
| <a id="property-detail"></a> `detail?` | `string` | - | [packages/plan/src/ladder.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L121) |
| <a id="property-gate"></a> `gate` | `"mechanical"` \| `"judge"` \| `"spot-check"` | - | [packages/plan/src/ladder.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L115) |
| <a id="property-logicaltaskid"></a> `logicalTaskId` | `string` | - | [packages/plan/src/ladder.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L111) |
| <a id="property-nodeid"></a> `nodeId` | `string` | - | [packages/plan/src/ladder.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L112) |
| <a id="property-pass"></a> `pass` | `boolean` | - | [packages/plan/src/ladder.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L120) |
| <a id="property-profile"></a> `profile?` | `string` | The registered profile name (mechanical gates). | [packages/plan/src/ladder.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L117) |
| <a id="property-rung"></a> `rung` | `number` | The executing rung of the judged attempt. | [packages/plan/src/ladder.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L119) |
| <a id="property-spotcheck"></a> `spotCheck?` | \{ `draw`: `number`; `fraction`: `number`; `selected`: `boolean`; \} | Spot-check only: the journaled draw and fraction behind `pass`. | [packages/plan/src/ladder.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L123) |
| `spotCheck.draw` | `number` | - | [packages/plan/src/ladder.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L123) |
| `spotCheck.fraction` | `number` | - | [packages/plan/src/ladder.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L123) |
| `spotCheck.selected` | `boolean` | - | [packages/plan/src/ladder.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/ladder.ts#L123) |
