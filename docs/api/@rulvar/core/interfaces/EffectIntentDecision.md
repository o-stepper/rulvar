[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectIntentDecision

# Interface: EffectIntentDecision

Defined in: [packages/core/src/effects/types.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L139)

The single linearization append (RFC section 4.3): consuming the
approval and recording the intent is THIS one entry. Whether it
consumed is a pure function of the strict journal prefix before it;
the fold computes the verdict, and a void intent derives the
`refused` terminal.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvalref"></a> `approvalRef` | `number` | Seq of the approval suspension this intent consumes. | [packages/core/src/effects/types.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L144) |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | [packages/core/src/effects/types.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L151) |
| <a id="property-artifacthash"></a> `artifactHash?` | `string` | The accepted artifact's hash (RV4207); binds bytes to the effect. | [packages/core/src/effects/types.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L153) |
| <a id="property-budgets"></a> `budgets` | [`EffectBudgets`](/api/@rulvar/core/interfaces/EffectBudgets.md) | - | [packages/core/src/effects/types.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L156) |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/core/type-aliases/EffectCapabilityRow.md) | - | [packages/core/src/effects/types.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L148) |
| <a id="property-compensates"></a> `compensates?` | `number` | Seq of the intent this one reverses (depth one, distinct key). | [packages/core/src/effects/types.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L158) |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | The terminal envelope's configFingerprint at admission. | [packages/core/src/effects/types.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L155) |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_intent"` | - | [packages/core/src/effects/types.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L140) |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/core/type-aliases/EffectClass.md) | - | [packages/core/src/effects/types.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L147) |
| <a id="property-epochref"></a> `epochRef` | `number` | Seq of the `effect_epoch` decision this intent cites. | [packages/core/src/effects/types.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L146) |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | [packages/core/src/effects/types.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L142) |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/core/type-aliases/EffectLookupQualification.md) | Required when capabilityRow is 'lookup' (RFC section 6). | [packages/core/src/effects/types.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L150) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/types.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L141) |
| <a id="property-successorof"></a> `successorOf?` | `number` | Seq of the intent this one succeeds (corrections, distinct key). | [packages/core/src/effects/types.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/types.ts#L160) |
