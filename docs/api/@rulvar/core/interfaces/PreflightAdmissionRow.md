[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L203)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L206) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L207) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L204) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L205) |
