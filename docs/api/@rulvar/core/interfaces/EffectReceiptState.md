[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectReceiptState

# Interface: EffectReceiptState

Defined in: [packages/core/src/effects/fold.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L98)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-amount"></a> `amount?` | `number` | - | [packages/core/src/effects/fold.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L104) |
| <a id="property-at"></a> `at` | `string` | The receipt entry's startedAt instant. | [packages/core/src/effects/fold.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L101) |
| <a id="property-benignduplicateof"></a> `benignDuplicateOf?` | `number` | Seq of the earlier verified receipt this one benignly duplicates. | [packages/core/src/effects/fold.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L110) |
| <a id="property-conflictwith"></a> `conflictWith?` | `number` | Seq of the earlier verified receipt this one conflicts with. | [packages/core/src/effects/fold.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L112) |
| <a id="property-currency"></a> `currency?` | `string` | - | [packages/core/src/effects/fold.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L105) |
| <a id="property-documenthash"></a> `documentHash?` | `string` | - | [packages/core/src/effects/fold.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L106) |
| <a id="property-providerref"></a> `providerRef?` | `string` | - | [packages/core/src/effects/fold.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L107) |
| <a id="property-seq"></a> `seq` | `number` | - | [packages/core/src/effects/fold.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L99) |
| <a id="property-timestamp"></a> `timestamp?` | `string` | - | [packages/core/src/effects/fold.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L108) |
| <a id="property-transferid"></a> `transferId?` | `string` | - | [packages/core/src/effects/fold.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L103) |
| <a id="property-verification"></a> `verification` | `"verified"` \| `"unverified"` | - | [packages/core/src/effects/fold.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L102) |
