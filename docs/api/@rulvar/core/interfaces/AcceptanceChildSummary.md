[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L239)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L240) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L243) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L248) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L246) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L245) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L244) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L247) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L242) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L241) |
