[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EvidenceContract

# Interface: EvidenceContract

Defined in: [packages/core/src/engine/ctx.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L237)

A declared evidence floor (RV303): preflight judges tool caps
against it, and under `enforce: 'refuse'` the runtime refuses an ok
settle below it (RV507); see [AgentProfile.evidenceContract](/api/@rulvar/core/interfaces/AgentProfile.md#property-evidencecontract).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-enforce"></a> `enforce?` | `"warn"` \| `"refuse"` | What the floor does at the child's terminal settle (RV507). The default 'warn' keeps the historical behavior: the contract is a preflight signal only. 'refuse' turns an ok finish whose message window carries fewer successful `record_evidence` executions (result `recorded: true`; duplicates and verification errors never count) than `minEntries` into a typed error terminal (kind 'terminal') whose journaled error data carries the machine-readable `evidenceFloor: { recordedEntries, minEntries }`; the outcome is memoized, so a resume rolls the refusal forward instead of re-paying the invocation. Non-ok terminals are never re-judged. | [packages/core/src/engine/ctx.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L256) |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | [packages/core/src/engine/ctx.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L241) |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | [packages/core/src/engine/ctx.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L239) |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | [packages/core/src/engine/ctx.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L243) |
