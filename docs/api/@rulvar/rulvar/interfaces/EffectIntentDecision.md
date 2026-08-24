[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectIntentDecision

# Interface: EffectIntentDecision

Defined in: `packages/core/dist/index.d.ts`

The single linearization append (RFC section 4.3): consuming the
approval and recording the intent is THIS one entry. Whether it
consumed is a pure function of the strict journal prefix before it;
the fold computes the verdict, and a void intent derives the
`refused` terminal.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvalref"></a> `approvalRef` | `number` | Seq of the approval suspension this intent consumes. | `packages/core/dist/index.d.ts` |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-artifacthash"></a> `artifactHash?` | `string` | The accepted artifact's hash (RV4207); binds bytes to the effect. | `packages/core/dist/index.d.ts` |
| <a id="property-budgets"></a> `budgets` | [`EffectBudgets`](/api/@rulvar/rulvar/interfaces/EffectBudgets.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/rulvar/type-aliases/EffectCapabilityRow.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-compensates"></a> `compensates?` | `number` | Seq of the intent this one reverses (depth one, distinct key). | `packages/core/dist/index.d.ts` |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | The terminal envelope's configFingerprint at admission. | `packages/core/dist/index.d.ts` |
| <a id="property-decisiontype"></a> `decisionType` | `"effect_intent"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/rulvar/type-aliases/EffectClass.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-epochref"></a> `epochRef` | `number` | Seq of the `effect_epoch` decision this intent cites. | `packages/core/dist/index.d.ts` |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/rulvar/type-aliases/EffectLookupQualification.md) | Required when capabilityRow is 'lookup' (RFC section 6). | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-successorof"></a> `successorOf?` | `number` | Seq of the intent this one succeeds (corrections, distinct key). | `packages/core/dist/index.d.ts` |
