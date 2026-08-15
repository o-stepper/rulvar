[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L226)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L227) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L230) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L235) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L233) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L232) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:231](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L231) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L234) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L229) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L228) |
