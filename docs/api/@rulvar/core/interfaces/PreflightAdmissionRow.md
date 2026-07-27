[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:295](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L295)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L298) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:299](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L299) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L296) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L297) |
