[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L252)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L253) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L256) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L261) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L259) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L258) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L257) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L260) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L255) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L254) |
