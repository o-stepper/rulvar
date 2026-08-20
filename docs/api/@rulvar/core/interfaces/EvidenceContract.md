[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EvidenceContract

# Interface: EvidenceContract

Defined in: [packages/core/src/engine/ctx.ts:240](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L240)

A declared evidence floor (RV303): preflight judges tool caps
against it, and under `enforce: 'refuse'` the runtime refuses an ok
settle below it (RV507); see [AgentProfile.evidenceContract](/api/@rulvar/core/interfaces/AgentProfile.md#property-evidencecontract).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-calibration"></a> `calibration?` | \{ `callsPerEntry`: `number`; `source?`: `string`; \} | A journal observed prior for the per-entry call estimate (RV3309): the figure `toolCalibrationFromJournal` folds from a prior run of the same profile (aggregate or a p90 over several), fractional on purpose. Preflight uses the HIGHER of the declared estimate and this prior when it computes the evidence call floor, never the lower, so a stale generous declaration still holds and an optimistic one stops hiding the observed reality: the 2026-08-12 comparison run observed 4.211 calls per entry where the default estimate says 3. When the prior raises the floor, preflight names it in an `evidence-estimate-below-observed` finding beside the usual floor arithmetic. `source` is echoed in that finding so a reader knows which journal spoke. | [packages/core/src/engine/ctx.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L261) |
| `calibration.callsPerEntry` | `number` | - | [packages/core/src/engine/ctx.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L261) |
| `calibration.source?` | `string` | - | [packages/core/src/engine/ctx.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L261) |
| <a id="property-enforce"></a> `enforce?` | `"warn"` \| `"refuse"` | What the floor does at the child's terminal settle (RV507). The default 'warn' keeps the historical behavior: the contract is a preflight signal only. 'refuse' turns an ok finish whose message window carries fewer successful `record_evidence` executions (result `recorded: true`; duplicates and verification errors never count) than `minEntries` into a typed error terminal (kind 'terminal') whose journaled error data carries the machine-readable `evidenceFloor: { recordedEntries, minEntries }`; the outcome is memoized, so a resume rolls the refusal forward instead of re-paying the invocation. Non-ok terminals are never re-judged. | [packages/core/src/engine/ctx.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L274) |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | [packages/core/src/engine/ctx.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L244) |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | [packages/core/src/engine/ctx.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L242) |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | [packages/core/src/engine/ctx.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L246) |
