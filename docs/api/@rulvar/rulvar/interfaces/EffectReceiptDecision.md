[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectReceiptDecision

# Interface: EffectReceiptDecision

Defined in: `packages/core/dist/index.d.ts`

A receipt observation, verified against the trust envelope BEFORE it
is appended as 'verified' (RFC section 7): an unverifiable receipt
appends as 'unverified' and routes the machine to `unknown`, never to
`confirmed` and never to silent discard.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-amount"></a> `amount?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-currency"></a> `currency?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_receipt"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-detail"></a> `detail?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-documenthash"></a> `documentHash?` | `string` | Signed document hash (signing class). | `packages/core/dist/index.d.ts` |
| <a id="property-intentref"></a> `intentRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-providerref"></a> `providerRef?` | `string` | Provider case or object reference. | `packages/core/dist/index.d.ts` |
| <a id="property-timestamp"></a> `timestamp?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-transferid"></a> `transferId?` | `string` | Provider transfer id (monetary); duplicate classification key. | `packages/core/dist/index.d.ts` |
| <a id="property-verification"></a> `verification` | `"verified"` \| `"unverified"` | - | `packages/core/dist/index.d.ts` |
