[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResumeOptions

# Interface: ResumeOptions

Defined in: [packages/core/src/engine/engine.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L275)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args?` | `unknown` | The run's original arguments: not journaled for in-process workflows in v1, so the host supplies them (resume binding residuals). | [packages/core/src/engine/engine.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L280) |
| <a id="property-dryrun"></a> `dryRun?` | `boolean` | Dry-run: replay-strict matching; the first would-be-live call throws JournalMissError and the run settles with that typed error, zero live calls performed. | [packages/core/src/engine/engine.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L286) |
| <a id="property-invalidate"></a> `invalidate?` | `number`[] | invalidate/retry: entries to unpin before matching. | [packages/core/src/engine/engine.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L288) |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) | Queue mode: the worker's lease. The engine carries it on EVERY journal append of this resume (the kernel's single append site), so a stale worker's writes are rejected by the fencing epoch and never become visible (M8 entry amendment; DEF-6; FR-703). putMeta and transcript blobs stay advisory and unfenced. | [packages/core/src/engine/engine.ts:297](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/engine.ts#L297) |
