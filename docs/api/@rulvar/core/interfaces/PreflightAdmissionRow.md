[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L251)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L254) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L255) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L252) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L253) |
