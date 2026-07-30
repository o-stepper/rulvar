[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightAdmissionRow

# Interface: PreflightAdmissionRow

Defined in: [packages/core/src/engine/preflight.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L318)

One wave entry of the admission projection.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `boolean` | [packages/core/src/engine/preflight.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L321) |
| <a id="property-deniedby"></a> `deniedBy?` | `"budget"` \| `"spawn-cap"` \| `"orchestrator-max-spawns"` | [packages/core/src/engine/preflight.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L322) |
| <a id="property-label"></a> `label` | `string` | [packages/core/src/engine/preflight.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L319) |
| <a id="property-reserveusd"></a> `reserveUsd` | `number` | [packages/core/src/engine/preflight.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L320) |
