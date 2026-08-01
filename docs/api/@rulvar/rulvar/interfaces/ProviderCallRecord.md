[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProviderCallRecord

# Interface: ProviderCallRecord

Defined in: `packages/core/dist/index.d.ts`

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
| <a id="property-aborted"></a> `aborted?` | `"external"` \| `"budget"` \| `"idle"` | What severed an 'aborted' call. | `packages/core/dist/index.d.ts` |
| <a id="property-attempt"></a> `attempt` | `number` | 1-based try number on the serving target; retries increment it. | `packages/core/dist/index.d.ts` |
| <a id="property-errorcode"></a> `errorCode?` | `string` | WireError.code on 'error' outcomes. | `packages/core/dist/index.d.ts` |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based dispatch order across the whole invocation, phases included. | `packages/core/dist/index.d.ts` |
| <a id="property-outcome"></a> `outcome` | `"ok"` \| `"error"` \| `"aborted"` | 'ok' = a terminal finish; 'error' = a wire failure after dispatch (the provider may still have billed the recorded usage); 'aborted' = the stream was severed by `aborted` below. | `packages/core/dist/index.d.ts` |
| <a id="property-responseid"></a> `responseId?` | `string` | The provider's response id from the finish metadata (`providerMetadata[<adapter id>].responseId`, surfaced by both shipped adapters). Absent when the adapter reported none or the call never finished; the invoice export marks such rows instead of dropping them. | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) | The invocation phase that paid the call. | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | This call's usage exactly, sanitized like every accounted number. | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | True when the stream was cut, so the usage is a lower bound. | `packages/core/dist/index.d.ts` |
| <a id="property-wirerequests"></a> `wireRequests?` | `number` | How many provider HTTP requests this ONE dispatch made, as the adapter reported it (RV1210: `providerMetadata[<adapter id>].wireRequests.count`). Recorded independently of `wireResponseIds` because a provider may leave a segment unnamed: counting ids alone understates the cardinality by exactly those segments, and the quota window (which settles on the count) would then disagree with the invoice. Absent on single-wire dispatches, keeping them byte-identical. | `packages/core/dist/index.d.ts` |
| <a id="property-wireresponseids"></a> `wireResponseIds?` | `string`[] | Every wire request's response id when the adapter absorbed provider-side continuations into this one dispatch (RV905: `providerMetadata[<adapter id>].wireRequests`, the Anthropic pause_turn absorption). A per-request provider statement bills each segment as its own row, so the reconciliation joins by ANY id of this set. Absent on single-wire dispatches, keeping them byte-identical. | `packages/core/dist/index.d.ts` |
