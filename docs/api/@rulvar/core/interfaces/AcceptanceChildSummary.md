[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L98)

One row of the acceptance fold's per-child roster (RV806): the
settled status, the salvage arm that accepted the child (absent when
none did), and the evidence verdict where the child declared an
evidence contract. `waivedBySalvage: true` marks a child whose
evidence floor was NOT met but which a salvage arm accepted anyway;
gate on it where waived evidence must not pass silently.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L99) |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L102) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L105) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L104) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L103) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L106) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L101) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L100) |
