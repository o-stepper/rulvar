[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L163)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L166) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` \| `"orchestrator-cap"` | [packages/core/src/engine/preflight.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L167) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L164) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L165) |
