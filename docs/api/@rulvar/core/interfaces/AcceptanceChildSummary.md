[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L103)

One row of the acceptance fold's per-child roster (RV806): the
settled status, the salvage arm that would have accepted the child
(absent when none applied), and the evidence verdict where the child
declared an evidence contract. `waivedBySalvage: true` marks a child
whose evidence floor was NOT met but which a salvage arm accepted
anyway; gate on it where waived evidence must not pass silently.
`floorRequired: true` marks the opposite verdict under
`acceptance.requireEvidenceFloor` (RV1207): the arm applied, the
floor was not met, and the child was NOT promoted, so the row is
diagnostic and the child counted against the policy.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L104) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L107) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L112) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L110) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L109) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L108) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L111) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L106) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L105) |
