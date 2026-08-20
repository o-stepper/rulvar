[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateSemanticAcceptance

# Interface: OrchestrateSemanticAcceptance

Defined in: [packages/core/src/orchestrator/orchestrate.ts:1354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1354)

The atomic production posture (RV4201, the sixth comparison
experiment). The experiment's run was configured knob by knob:
`report` findings postures, a standing waiver, no repair round, and
every one of those choices was individually legal while their SUM
quietly meant "observe and ship anyway"; the run then settled
accepted over a partial grade, a judged contradiction, and five
unsupported citations. This declaration is the one object that says
the opposite, in full, and intake REFUSES any underlying field that
contradicts it (nothing is filled: a signature has no blanks, so
the host writes the machinery the declaration binds). Under it a
run can settle accepted only when the FINAL document's claim
coverage graded 'full', zero judged contradictions and zero
unsupported (unresolved included) sampled citations survived the
one bounded round where the posture arms it, and no waiver stood,
except the pinned-hash form, which licenses exactly one reviewed
document. `compileRegulatedProfile` fills and enforces this
declaration for regulated runs (RV4201); plain orchestrations opt
in by declaring it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citations"></a> `citations` | `"fail"` \| `"repair-once-then-fail"` | What an unsupported sampled citation does, same mapping onto `citationAudit.onFound`; 'report' refuses at intake. | [packages/core/src/orchestrator/orchestrate.ts:1382](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1382) |
| <a id="property-claimcoverage"></a> `claimCoverage` | `"full"` | The only acceptable final coverage grade. Requires `claimConsistency.coveragePolicy: 'strict-final'`, and refuses a declared `coverageTarget` below 1, because a pass sized to cover less than everything can never grade 'full' on a citing document: the declaration would be unsatisfiable by construction. | [packages/core/src/orchestrator/orchestrate.ts:1368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1368) |
| <a id="property-contradictions"></a> `contradictions` | `"fail"` \| `"repair-once-then-fail"` | What a judged claim contradiction does: 'repair-once-then-fail' requires `claimConsistency.onFound: 'repair'` (survivors of the bounded round already fail typed) plus `coverageRepair: true` (the one round serves every armed defect class, coverage included); 'fail' requires `onFound: 'fail'`. The observing postures ('report', 'carry') refuse at intake. | [packages/core/src/orchestrator/orchestrate.ts:1377](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1377) |
| <a id="property-judgedstage"></a> `judgedStage` | `"final"` | The document the verdicts must describe: the FINAL one, always. Requires `claimConsistency.stage` 'final' or 'both'; the literal exists so the signature spells its object out. | [packages/core/src/orchestrator/orchestrate.ts:1360](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1360) |
| <a id="property-unresolved"></a> `unresolved` | `"fail"` | What a sampled citation that resolves NOTHING does. Mechanically unresolved rows are unsupported findings already (the citedValueValidator doctrine), so the field binds no new machinery; it exists because a signature that is silent about the rows no judge ever saw would be a blank exactly where the sixth experiment's audit found its five. | [packages/core/src/orchestrator/orchestrate.ts:1391](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1391) |
| <a id="property-waiver"></a> `waiver` | \| `"forbid"` \| \{ `judgedHash`: `string`; \} | The waiver posture. 'forbid': `claimConsistency.waiver` must be absent, and a journaled `claim_coverage_waived` decision surfacing under this declaration refuses typed (a journal that waived under a config that forbids waivers is a config/journal mismatch, not an authority). The pinned form carries the sha256 of the ONE document the waiver may license (the claim meta's `judgedHash`, 64 hex chars): a signature under a reviewed document, never a blank cheque, so a re-run that composes any other bytes refuses exactly as if no waiver stood. Requires a declared `claimConsistency.waiver` naming the principal and the reason. | [packages/core/src/orchestrator/orchestrate.ts:1405](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1405) |
