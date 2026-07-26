[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L284)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L287) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L288) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:285](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L285) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L286) |
