[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L152)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L153) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L156) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L161) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L159) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L158) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L157) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L160) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L155) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L154) |
