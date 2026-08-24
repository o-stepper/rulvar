[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectReceiptDecision

# Interface: EffectReceiptDecision

Defined in: [packages/core/src/effects/types.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L202)

A receipt observation, verified against the trust envelope BEFORE it
is appended as 'verified' (RFC section 7): an unverifiable receipt
appends as 'unverified' and routes the machine to `unknown`, never to
`confirmed` and never to silent discard.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-amount"></a> `amount?` | `number` | - | [packages/core/src/effects/types.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L209) |
| <a id="property-currency"></a> `currency?` | `string` | - | [packages/core/src/effects/types.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L210) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_receipt"` | - | [packages/core/src/effects/types.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L203) |
| <a id="property-detail"></a> `detail?` | `string` | - | [packages/core/src/effects/types.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L216) |
| <a id="property-documenthash"></a> `documentHash?` | `string` | Signed document hash (signing class). | [packages/core/src/effects/types.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L212) |
| <a id="property-intentref"></a> `intentRef` | `number` | - | [packages/core/src/effects/types.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L205) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L204) |
| <a id="property-providerref"></a> `providerRef?` | `string` | Provider case or object reference. | [packages/core/src/effects/types.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L214) |
| <a id="property-timestamp"></a> `timestamp?` | `string` | - | [packages/core/src/effects/types.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L215) |
| <a id="property-transferid"></a> `transferId?` | `string` | Provider transfer id (monetary); duplicate classification key. | [packages/core/src/effects/types.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L208) |
| <a id="property-verification"></a> `verification` | `"verified"` \| `"unverified"` | - | [packages/core/src/effects/types.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L206) |
