[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L260)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L263) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L264) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L261) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L262) |
