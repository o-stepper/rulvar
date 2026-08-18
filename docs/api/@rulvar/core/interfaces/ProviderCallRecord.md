[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProviderCallRecord

# Interface: ProviderCallRecord

Defined in: [packages/core/src/l0/entries.ts:118](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L118)

One live provider dispatch of an agent invocation (P1.3, the durable
reconciliation ledger): every wire call the engine actually made,
successful or not, with the usage it consumed and the provider's
response id when the adapter surfaced one. Quota-denied attempts and
abort short circuits that never reached the adapter mint no record:
the ledger enumerates exactly the calls a provider could bill.
Records are minted from the same sanitized usage the phase slices
accumulate, so per-model sums over an entry's records reconcile with
`usageByModel` (and with `usage`) by construction on a fully live
invocation.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-aborted"></a> `aborted?` | `"budget"` \| `"external"` \| `"idle"` | What severed an 'aborted' call. | [packages/core/src/l0/entries.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L174) |
| <a id="property-attempt"></a> `attempt` | `number` | 1-based DISPATCHED try number on the serving target; transport retries increment it, a pre-wire quota denial never does (RV1601), so the recorded attempts of one (role, target) series are always dense from 1 and an attempt=2 row proves a prior dispatched try with its own record. | [packages/core/src/l0/entries.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L131) |
| <a id="property-errorcode"></a> `errorCode?` | `string` | WireError.code on 'error' outcomes. | [packages/core/src/l0/entries.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L172) |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based dispatch order across the whole invocation, phases included. | [packages/core/src/l0/entries.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L120) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` | 'ok' = a terminal finish; 'error' = a wire failure after dispatch (the provider may still have billed the recorded usage); 'aborted' = the stream was severed by `aborted` below. | [packages/core/src/l0/entries.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L137) |
| <a id="property-phase"></a> `phase?` | `"repair"` | The wire-level phase override (RV4002, the fifth comparison experiment): 'repair' on the call that immediately follows a rejected terminal-tool exchange, the granted mechanical repair turn's own wire. Phase is otherwise a per-dispatch fact (`costAttribution.phase`), which is exactly how the experiment's one draft repair wire drowned in 'coordination': the judge had to reconstruct the repair from the raw transcript while the invoice said nothing. The cost folds bucket a call carrying this override under it instead of the dispatch phase; absent on every other call, keeping non-repair runs byte identical. | [packages/core/src/l0/entries.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L187) |
| <a id="property-responseid"></a> `responseId?` | `string` | The provider's response id from the finish metadata (`providerMetadata[<adapter id>].responseId`, surfaced by both shipped adapters). Absent when the adapter reported none or the call never finished; the invoice export marks such rows instead of dropping them. | [packages/core/src/l0/entries.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L145) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | The invocation phase that paid the call. | [packages/core/src/l0/entries.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L122) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/l0/entries.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L123) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | This call's usage exactly, sanitized like every accounted number. | [packages/core/src/l0/entries.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L168) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | True when the stream was cut, so the usage is a lower bound. | [packages/core/src/l0/entries.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L170) |
| <a id="property-wirerequests"></a> `wireRequests?` | `number` | How many provider HTTP requests this ONE dispatch made, as the adapter reported it (RV1210: `providerMetadata[<adapter id>].wireRequests.count`). Recorded independently of `wireResponseIds` because a provider may leave a segment unnamed: counting ids alone understates the cardinality by exactly those segments, and the quota window (which settles on the count) would then disagree with the invoice. Absent on single-wire dispatches, keeping them byte-identical. | [packages/core/src/l0/entries.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L166) |
| <a id="property-wireresponseids"></a> `wireResponseIds?` | `string`[] | Every wire request's response id when the adapter absorbed provider-side continuations into this one dispatch (RV905: `providerMetadata[<adapter id>].wireRequests`, the Anthropic pause_turn absorption). A per-request provider statement bills each segment as its own row, so the reconciliation joins by ANY id of this set. Absent on single-wire dispatches, keeping them byte-identical. | [packages/core/src/l0/entries.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L155) |
