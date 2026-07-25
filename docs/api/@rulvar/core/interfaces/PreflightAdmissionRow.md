[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L194)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L197) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L198) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:195](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L195) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L196) |
