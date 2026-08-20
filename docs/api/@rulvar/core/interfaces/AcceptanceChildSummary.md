[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L260)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L261) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L264) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L269) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L267) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L266) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L265) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L268) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L263) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L262) |
