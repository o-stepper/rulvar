[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L214)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L215) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L218) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L223) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L221) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L220) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L219) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L222) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L217) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L216) |
