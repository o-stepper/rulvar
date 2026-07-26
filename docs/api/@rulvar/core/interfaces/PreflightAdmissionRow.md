[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L268)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L271) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L272) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L269) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L270) |
