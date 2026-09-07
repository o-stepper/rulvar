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
| <a id="property-calibration"></a> `calibration?` | \{ `callsPerEntry`: `number`; `source?`: `string`; \} | A journal observed prior for the per-entry call estimate (RV3309): the figure `toolCalibrationFromJournal` folds from a prior run of the same profile (aggregate or a p90 over several), fractional on purpose. Preflight uses the HIGHER of the declared estimate and this prior when it computes the evidence call floor, never the lower, so a stale generous declaration still holds and an optimistic one stops hiding the observed reality: the 2026-08-12 comparison run observed 4.211 calls per entry where the default estimate says 3. When the prior raises the floor, preflight names it in an `evidence-estimate-below-observed` finding beside the usual floor arithmetic. `source` is echoed in that finding so a reader knows which journal spoke. | `packages/core/dist/index.d.ts` |
| `calibration.callsPerEntry` | `number` | - | `packages/core/dist/index.d.ts` |
| `calibration.source?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-classify"></a> `classify?` | (`file`) => [`EvidenceCategory`](/api/@rulvar/rulvar/type-aliases/EvidenceCategory.md) | Replaces the default path classifier; must return one of the four categories. | `packages/core/dist/index.d.ts` |
| <a id="property-distribution"></a> `distribution?` | `Partial`\&lt;`Record`\&lt;[`EvidenceCategory`](/api/@rulvar/rulvar/type-aliases/EvidenceCategory.md), `number`\&gt;\&gt; | The required spread of entries over source categories (RV4908, the tenth comparison experiment): the task demanded citations across implementation, tests, documentation, and examples, the contract could say only `minEntries`, the specialists cited documentation alone, and the judge took the points. Each declared category must reach its count of successful `record_evidence` executions whose `file` classifies into it (`classifyEvidenceFile` by default: test files and test directories are `tests`, an `examples` directory is `examples`, a `docs` directory or a prose file is `docs`, everything else `implementation`; `classify` replaces it). The effective floor is the larger of `minEntries` and the categories' sum: the finalization window's deficit and widened reserve, the RV809 proactive grant, the surplus gate, the terminal verdict (`evidence.byCategory`, `met` only when every category is met), and the `enforce: 'refuse'` refusal all read the per category shortfall, and the window notice names it ("record 3 more evidence entries first (implementation: 2 more, tests: 1 more)"). Preflight sizes the evidence call floor to the effective floor. Absent, every surface keeps its bytes. Policy, never identity. | `packages/core/dist/index.d.ts` |
| <a id="property-enforce"></a> `enforce?` | `"warn"` \| `"refuse"` | What the floor does at the child's terminal settle (RV507). The default 'warn' keeps the historical behavior: the contract is a preflight signal only. 'refuse' turns an ok finish whose message window carries fewer successful `record_evidence` executions (result `recorded: true`; duplicates and verification errors never count) than `minEntries` into a typed error terminal (kind 'terminal') whose journaled error data carries the machine-readable `evidenceFloor: { recordedEntries, minEntries }`; the outcome is memoized, so a resume rolls the refusal forward instead of re-paying the invocation. Non-ok terminals are never re-judged. | `packages/core/dist/index.d.ts` |
| <a id="property-estcallsperentry"></a> `estCallsPerEntry?` | `number` | Estimated executed calls per recorded entry; default 3. | `packages/core/dist/index.d.ts` |
| <a id="property-minentries"></a> `minEntries` | `number` | Evidence entries the task must record; positive integer. | `packages/core/dist/index.d.ts` |
| <a id="property-overheadcalls"></a> `overheadCalls?` | `number` | Estimated non-evidence overhead calls; default 8. | `packages/core/dist/index.d.ts` |
