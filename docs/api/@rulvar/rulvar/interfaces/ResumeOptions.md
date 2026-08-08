[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResumeOptions

# Interface: ResumeOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `unknown` | The run's original arguments: not journaled for in-process workflows in v1, so the host supplies them (resume binding residuals). | `packages/core/dist/index.d.ts` |
| <a id="property-dryrun"></a> `dryRun?` | `boolean` | Dry-run: replay-strict matching; the first would-be-live call throws JournalMissError and the run settles with that typed error, zero live calls performed. | `packages/core/dist/index.d.ts` |
| <a id="property-invalidate"></a> `invalidate?` | `number`[] | invalidate/retry: entries to unpin before matching. | `packages/core/dist/index.d.ts` |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) | Queue mode: the worker's lease. The engine carries it on EVERY durable mutation of this resume: every journal append (the kernel's single append site; M8 entry amendment; DEF-6; FR-703), every putMeta, and every transcript blob write (checkpoints, compaction summaries, worktree patches, workflow sources). Over a store declaring the fencedWrites capability a stale worker's writes are ALL rejected by the fencing epoch and never become visible; over a store without the marker the journal stays fenced as always and the meta/blob surfaces remain advisory (the fenced run state RFC). | `packages/core/dist/index.d.ts` |
| <a id="property-run"></a> `run?` | \{ `budgetUsd?`: `number`; `maxInFlightExposureUsd?`: `number`; \} | Ceiling overrides for the resumed segment and the run's remaining life (RV2208). The RV1504 rule stands: the RunMeta-recorded posture is what a bare resume restores; this field is the ONE explicit way to change that posture after genesis. Each supplied value is validated exactly like its RunOptions counterpart, applied to this segment's budget, written back by the segment's first meta write (a LATER bare resume restores the overridden posture, not the genesis one), and journaled as a `run_budget_override` decision naming the recorded and applied values and the settled spend it was judged against. A `budgetUsd` below the journal's settled spend refuses typed before ownership, meta, or any append: such a ceiling would exhaust the segment before its first turn and read like a fresh money death. Absent fields keep the recorded values; an absent object keeps the historical behavior byte for byte. | `packages/core/dist/index.d.ts` |
| `run.budgetUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
| `run.maxInFlightExposureUsd?` | `number` | - | `packages/core/dist/index.d.ts` |
