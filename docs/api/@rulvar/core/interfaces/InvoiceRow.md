[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvoiceRow

# Interface: InvoiceRow

Defined in: [packages/core/src/engine/invoice.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L69)

One billable provider call (or an unattributed usage remainder).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-abandoned"></a> `abandoned?` | `true` | The row lies under an abandoned subtree: in grossUsd, not in netUsd. | [packages/core/src/engine/invoice.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L141) |
| <a id="property-agenttype"></a> `agentType?` | `string` | The spawn's agent type from the terminal's cost attribution (RV3906, the fourth comparison experiment): in dynamic runs the scope grammar nests every orchestrator spawn under one `agent:<seq>` bucket, so per-child money used to require a join through the journal; the row now names the profile directly. Additive and policy, never identity: absent on entries journaled before cost attribution shipped, on empty attributions, and on every pre-RV3906 export byte, so old journals and old consumers read exactly what they always read. | [packages/core/src/engine/invoice.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L85) |
| <a id="property-allocatedusd"></a> `allocatedUsd` | `number` | The additive FinOps column: this row's share of `totalUsd`, always present (zero for rows on unpriced models). Shares are computed within the row's own (entry, serving model) slice of the same gross fold the totals run, proportional to per-row `usd`, and one row absorbs the IEEE rounding dust, so summing `allocatedUsd` over `rows` reproduces `totalUsd` exactly where summing `usd` does not. | [packages/core/src/engine/invoice.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L139) |
| <a id="property-attempt"></a> `attempt?` | `number` | 1-based try number on the serving target (retries increment it). | [packages/core/src/engine/invoice.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L98) |
| <a id="property-entryseq"></a> `entrySeq` | `number` | The terminal journal entry the row folds from. | [packages/core/src/engine/invoice.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L71) |
| <a id="property-key"></a> `key` | `string` | - | [packages/core/src/engine/invoice.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L73) |
| <a id="property-label"></a> `label?` | `string` | The dispatch label from the same attribution (RV2803 journaled it; RV3906 lifts it onto the row), what tells two spans of one role apart without a journal join. Absent on unlabelled dispatches, additive exactly like `agentType`. | [packages/core/src/engine/invoice.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L92) |
| <a id="property-ordinal"></a> `ordinal` | `number` | The call's dispatch ordinal within its invocation; remainder and slice rows continue past it. | [packages/core/src/engine/invoice.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L94) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` \| `"unattributed"` | - | [packages/core/src/engine/invoice.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L99) |
| <a id="property-reconciliation"></a> `reconciliation` | [`InvoiceReconciliation`](/api/@rulvar/core/type-aliases/InvoiceReconciliation.md) | - | [packages/core/src/engine/invoice.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L142) |
| <a id="property-responseid"></a> `responseId?` | `string` | - | [packages/core/src/engine/invoice.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L100) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/engine/invoice.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L96) |
| <a id="property-scope"></a> `scope` | `string` | - | [packages/core/src/engine/invoice.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L72) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/engine/invoice.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L95) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/engine/invoice.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L116) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/engine/invoice.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L117) |
| <a id="property-usageunknown"></a> `usageUnknown?` | `true` | Present and true when this `unconfirmed` row recorded ZERO usage on every counter (the v1.71 experiment review, P1.4): a failed attempt whose usage this ledger never saw. The zeros mean "nothing recorded", never "the provider metered nothing": the provider may have billed prompt processing before the failure, so a statement join must treat this row's usage as unknown, not as zero. Derived at export time from the journaled record; rows with any recorded usage, and every other verdict, never carry it. | [packages/core/src/engine/invoice.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L128) |
| <a id="property-usd"></a> `usd?` | `number` | This row priced at its own model's rate; absent when no price row covers it. | [packages/core/src/engine/invoice.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L130) |
| <a id="property-wirerequests"></a> `wireRequests?` | `number` | Provider HTTP requests this ONE row represents (RV1210), from the adapter's reported count rather than the id list: a provider that left an absorbed segment unnamed still billed it. Absent on single-wire rows, where the row IS the request. | [packages/core/src/engine/invoice.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L115) |
| <a id="property-wireresponseids"></a> `wireResponseIds?` | `string`[] | Every wire request's response id when the adapter absorbed provider-side continuations into this one dispatch (RV905); a per-request statement bills each segment as its own row, so the reconciliation joins this row by ANY id of the set. Absent on single-wire rows. | [packages/core/src/engine/invoice.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/invoice.ts#L108) |
