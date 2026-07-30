[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AcceptanceChildSummary

# Interface: AcceptanceChildSummary

Defined in: `packages/core/dist/index.d.ts`

One row of the acceptance fold's per-child roster (RV806): the
settled status, the salvage arm that accepted the child (absent when
none did), and the evidence verdict where the child declared an
evidence contract. `waivedBySalvage: true` marks a child whose
evidence floor was NOT met but which a salvage arm accepted anyway;
gate on it where waived evidence must not pass silently.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-child"></a> `child` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \} | `packages/core/dist/index.d.ts` |
| `evidence.met` | `boolean` | `packages/core/dist/index.d.ts` |
| `evidence.minEntries` | `number` | `packages/core/dist/index.d.ts` |
| `evidence.recordedEntries` | `number` | `packages/core/dist/index.d.ts` |
| `evidence.waivedBySalvage?` | `true` | `packages/core/dist/index.d.ts` |
| <a id="property-salvage"></a> `salvage?` | `"partial"` \| `"terminal-output"` | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `string` | `packages/core/dist/index.d.ts` |
