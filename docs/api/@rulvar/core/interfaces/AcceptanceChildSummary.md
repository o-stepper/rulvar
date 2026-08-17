[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L233)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L234) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L237) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L242) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L240) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L239) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L238) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L241) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L236) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L235) |
