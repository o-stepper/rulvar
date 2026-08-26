[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L260)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | - | [packages/core/src/engine/run-handle.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L261) |
| <a id="property-error"></a> `error?` | \{ `kind`: `string`; `message?`: `string`; `stage?`: `string`; \} | The child's own typed death reason (RV4703), from its settled terminal: present exactly when the child settled carrying an error. The eighth comparison experiment's first run rejected on "child settled 'error'" while the child's terminal named the budget-refused finalize dispatch; the roster is machine readable, so the reason is too. The message is bounded to 200 characters; `stage` names the dispatch a budget refusal killed, when the loop stamped one. | [packages/core/src/engine/run-handle.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L273) |
| `error.kind` | `string` | - | [packages/core/src/engine/run-handle.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L273) |
| `error.message?` | `string` | - | [packages/core/src/engine/run-handle.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L273) |
| `error.stage?` | `string` | - | [packages/core/src/engine/run-handle.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L273) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | - | [packages/core/src/engine/run-handle.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L275) |
| `evidence.floorRequired?` | `true` | - | [packages/core/src/engine/run-handle.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L280) |
| `evidence.met` | `boolean` | - | [packages/core/src/engine/run-handle.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L278) |
| `evidence.minEntries` | `number` | - | [packages/core/src/engine/run-handle.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L277) |
| `evidence.recordedEntries` | `number` | - | [packages/core/src/engine/run-handle.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L276) |
| `evidence.waivedBySalvage?` | `true` | - | [packages/core/src/engine/run-handle.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L279) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | - | [packages/core/src/engine/run-handle.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L274) |
| <a id="property-status"></a> `status` | `string` | - | [packages/core/src/engine/run-handle.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L262) |
