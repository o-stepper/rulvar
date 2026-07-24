[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProviderCallRecord

# Interface: ProviderCallRecord

Defined in: [packages/core/src/l0/entries.ts:117](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L117)

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
| <a id="property-aborted"></a> `aborted?` | `"budget"` \| `"external"` \| `"idle"` | What severed an 'aborted' call. | [packages/core/src/l0/entries.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L146) |
| <a id="property-attempt"></a> `attempt` | `number` | 1-based try number on the serving target; retries increment it. | [packages/core/src/l0/entries.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L124) |
| <a id="property-errorcode"></a> `errorCode?` | `string` | WireError.code on 'error' outcomes. | [packages/core/src/l0/entries.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L144) |
| <a id="property-ordinal"></a> `ordinal` | `number` | 1-based dispatch order across the whole invocation, phases included. | [packages/core/src/l0/entries.ts:119](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L119) |
| <a id="property-outcome"></a> `outcome` | `"error"` \| `"ok"` \| `"aborted"` | 'ok' = a terminal finish; 'error' = a wire failure after dispatch (the provider may still have billed the recorded usage); 'aborted' = the stream was severed by `aborted` below. | [packages/core/src/l0/entries.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L130) |
| <a id="property-responseid"></a> `responseId?` | `string` | The provider's response id from the finish metadata (`providerMetadata[<adapter id>].responseId`, surfaced by both shipped adapters). Absent when the adapter reported none or the call never finished; the invoice export marks such rows instead of dropping them. | [packages/core/src/l0/entries.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L138) |
| <a id="property-role"></a> `role` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | The invocation phase that paid the call. | [packages/core/src/l0/entries.ts:121](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L121) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | - | [packages/core/src/l0/entries.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L122) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | This call's usage exactly, sanitized like every accounted number. | [packages/core/src/l0/entries.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L140) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | True when the stream was cut, so the usage is a lower bound. | [packages/core/src/l0/entries.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L142) |
