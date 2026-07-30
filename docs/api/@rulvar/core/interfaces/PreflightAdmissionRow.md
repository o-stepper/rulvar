[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L313)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L316) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:317](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L317) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L314) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:315](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L315) |
