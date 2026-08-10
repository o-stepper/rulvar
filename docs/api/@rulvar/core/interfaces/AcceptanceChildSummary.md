[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L207)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L208) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:211](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L211) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L216) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L214) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L213) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L212) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L215) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L210) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L209) |
