[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RepairLedgerRound

# Interface: RepairLedgerRound

Defined in: `packages/core/dist/index.d.ts`

One granted repair, folded from its journaled verdict (RV4002).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-callid"></a> `callId?` | `string` | The finish call id the verdict was keyed by, when journaled. | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd?` | `number` | That wire priced at the caller's table; absent when unpriceable. | `packages/core/dist/index.d.ts` |
| <a id="property-failedvalidators"></a> `failedValidators` | readonly `string`[] | The failed validator names, verbatim from the verdict. | `packages/core/dist/index.d.ts` |
| <a id="property-sections"></a> `sections?` | readonly `string`[] | The section markers the repair actually resubmitted, when the healing attempt was a sectional splice whose acceptance journaled them (the draft gate's `orchestrator_draft_gate` acceptance and the RV808b finish splice both record theirs). | `packages/core/dist/index.d.ts` |
| <a id="property-seq"></a> `seq` | `number` | The verdict decision's seq: the repair's address in the run. | `packages/core/dist/index.d.ts` |
| <a id="property-stage"></a> `stage` | `"draft"` \| `"composition"` \| `"round"` | Which gate granted it: the draft gate, a composition invocation, or the RV3307 round's own pool. | `packages/core/dist/index.d.ts` |
| <a id="property-wireref"></a> `wireRef?` | `number` | The repair wire's own address: the seq of the first incremental billing row after this verdict whose record carries the RV4002 wire-level `phase: 'repair'` stamp, in the same scope. Absent when the row has not landed (the RV2008 async posture) or predates the stamp. | `packages/core/dist/index.d.ts` |
