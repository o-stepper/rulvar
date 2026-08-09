[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L184)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L185) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L188) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:193](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L193) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L191) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L190) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L189) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L192) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L187) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L186) |
