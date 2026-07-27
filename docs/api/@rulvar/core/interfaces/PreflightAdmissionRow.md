[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L306)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L309) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L310) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:307](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L307) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:308](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L308) |
