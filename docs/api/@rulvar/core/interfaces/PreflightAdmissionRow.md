[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L271)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L274) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L275) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L272) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L273) |
