[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: [packages/core/src/engine/run-handle.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L131)

One row of the acceptance fold's per-child roster (RV806): the
settled status, the salvage arm that would have accepted the child
(absent when none applied), and the evidence verdict where the child
declared an evidence contract. `waivedBySalvage: true` marks a child
whose evidence floor was NOT met but which a salvage arm accepted
anyway; gate on it where waived evidence must not pass silently.
`floorRequired: true` marks the opposite verdict under
`acceptance.requireEvidenceFloor` (RV1207): the arm applied, the
floor was not met, and the child was NOT promoted, so the row is
diagnostic and the child counted against the policy. Since RV1412 an
OK row can carry `floorRequired` too: the child settled 'ok' below
its declared floor and the same flag excluded it from the policy
count (without the flag such a row keeps `met: false` unmarked, and
the child rides `belowFloorOkChildren` with a degradation note).

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | [packages/core/src/engine/run-handle.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L132) |
| <a id="property-evidence"></a> `evidence?` | \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | [packages/core/src/engine/run-handle.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L135) |
| `evidence.floorRequired?` | `true` | [packages/core/src/engine/run-handle.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L140) |
| `evidence.met` | `boolean` | [packages/core/src/engine/run-handle.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L138) |
| `evidence.minEntries` | `number` | [packages/core/src/engine/run-handle.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L137) |
| `evidence.recordedEntries` | `number` | [packages/core/src/engine/run-handle.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L136) |
| `evidence.waivedBySalvage?` | `true` | [packages/core/src/engine/run-handle.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L139) |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | [packages/core/src/engine/run-handle.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L134) |
| <a id="property-status"></a> `status` | `string` | [packages/core/src/engine/run-handle.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/run-handle.ts#L133) |
