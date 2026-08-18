[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L240)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L241) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L244) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L249) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L247) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L246) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L245) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L248) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L243) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L242) |
