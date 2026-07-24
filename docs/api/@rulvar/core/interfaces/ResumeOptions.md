[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumeOptions

# Interface: ResumeOptions

Defined in: [packages/core/src/engine/engine.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L331)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `unknown` | The run's original arguments: not journaled for in-process workflows in v1, so the host supplies them (resume binding residuals). | [packages/core/src/engine/engine.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L336) |
| <a id="property-dryrun"></a> `dryRun?` | `boolean` | Dry-run: replay-strict matching; the first would-be-live call throws JournalMissError and the run settles with that typed error, zero live calls performed. | [packages/core/src/engine/engine.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L342) |
| <a id="property-invalidate"></a> `invalidate?` | `number`[] | invalidate/retry: entries to unpin before matching. | [packages/core/src/engine/engine.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L344) |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) | Queue mode: the worker's lease. The engine carries it on EVERY durable mutation of this resume: every journal append (the kernel's single append site; M8 entry amendment; DEF-6; FR-703), every putMeta, and every transcript blob write (checkpoints, compaction summaries, worktree patches, workflow sources). Over a store declaring the fencedWrites capability a stale worker's writes are ALL rejected by the fencing epoch and never become visible; over a store without the marker the journal stays fenced as always and the meta/blob surfaces remain advisory (the fenced run state RFC). | [packages/core/src/engine/engine.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L356) |
