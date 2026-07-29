[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EvidenceContract

# Interface: EvidenceContract

Defined in: `packages/core/dist/index.d.ts`

A declared evidence floor (RV303): preflight judges tool caps
against it, and under `enforce: 'refuse'` the runtime refuses an ok
settle below it (RV507); see [AgentProfile.evidenceContract](/api/@rulvar/rulvar/interfaces/AgentProfile.md#property-evidencecontract).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-enforce"></a> `enforce?` | `"warn"` \| `"refuse"` | What the floor does at the child's terminal settle (RV507). The default 'warn' keeps the historical behavior: the contract is a preflight signal only. 'refuse' turns an ok finish whose message window carries fewer successful `record_evidence` executions (result `recorded: true`; duplicates and verification errors never count) than `minEntries` into a typed error terminal (kind 'terminal') whose journaled error data carries the machine-readable `evidenceFloor: { recordedEntries, minEntries }`; the outcome is memoized, so a resume rolls the refusal forward instead of re-paying the invocation. Non-ok terminals are never re-judged. | `packages/core/dist/index.d.ts` |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | `packages/core/dist/index.d.ts` |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | `packages/core/dist/index.d.ts` |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | `packages/core/dist/index.d.ts` |
