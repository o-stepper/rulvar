[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectMachine

# Interface: EffectMachine

Defined in: [packages/core/src/effects/fold.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L130)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvalref"></a> `approvalRef` | `number` | - | [packages/core/src/effects/fold.ts:134](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L134) |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | [packages/core/src/effects/fold.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L139) |
| <a id="property-artifacthash"></a> `artifactHash?` | `string` | - | [packages/core/src/effects/fold.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L140) |
| <a id="property-attempts"></a> `attempts` | [`EffectAttemptState`](/api/@rulvar/core/interfaces/EffectAttemptState.md)[] | - | [packages/core/src/effects/fold.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L149) |
| <a id="property-budgets"></a> `budgets` | [`EffectBudgets`](/api/@rulvar/core/interfaces/EffectBudgets.md) | - | [packages/core/src/effects/fold.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L142) |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/core/type-aliases/EffectCapabilityRow.md) | - | [packages/core/src/effects/fold.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L137) |
| <a id="property-compensatedby"></a> `compensatedBy?` | `number` | The confirmed compensation citing this intent (derived overlay). | [packages/core/src/effects/fold.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L159) |
| <a id="property-compensates"></a> `compensates?` | `number` | - | [packages/core/src/effects/fold.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L143) |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | - | [packages/core/src/effects/fold.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L141) |
| <a id="property-consumed"></a> `consumed` | `boolean` | True when the consumption fold licensed the intent. | [packages/core/src/effects/fold.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L146) |
| <a id="property-dispositions"></a> `dispositions` | [`EffectDispositionState`](/api/@rulvar/core/interfaces/EffectDispositionState.md)[] | - | [packages/core/src/effects/fold.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L152) |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/core/type-aliases/EffectClass.md) | - | [packages/core/src/effects/fold.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L136) |
| <a id="property-epochref"></a> `epochRef` | `number` | - | [packages/core/src/effects/fold.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L135) |
| <a id="property-incidents"></a> `incidents` | [`EffectIncidentState`](/api/@rulvar/core/interfaces/EffectIncidentState.md)[] | - | [packages/core/src/effects/fold.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L151) |
| <a id="property-intentseq"></a> `intentSeq` | `number` | - | [packages/core/src/effects/fold.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L131) |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | [packages/core/src/effects/fold.ts:133](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L133) |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/core/type-aliases/EffectLookupQualification.md) | - | [packages/core/src/effects/fold.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L138) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/fold.ts:132](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L132) |
| <a id="property-pendingconflict"></a> `pendingConflict?` | \{ `detail`: `string`; `seq`: `number`; \} | A pre-terminal conflicting receipt awaiting the quarantine append. | [packages/core/src/effects/fold.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L155) |
| `pendingConflict.detail` | `string` | - | [packages/core/src/effects/fold.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L155) |
| `pendingConflict.seq` | `number` | - | [packages/core/src/effects/fold.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L155) |
| <a id="property-postintentcloser"></a> `postIntentCloser?` | [`PostIntentCloser`](/api/@rulvar/core/interfaces/PostIntentCloser.md) | Set at finalize; re-dispatch is disabled from this position on. | [packages/core/src/effects/fold.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L157) |
| <a id="property-receipts"></a> `receipts` | [`EffectReceiptState`](/api/@rulvar/core/interfaces/EffectReceiptState.md)[] | - | [packages/core/src/effects/fold.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L150) |
| <a id="property-state"></a> `state` | [`EffectMachineState`](/api/@rulvar/core/type-aliases/EffectMachineState.md) | - | [packages/core/src/effects/fold.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L148) |
| <a id="property-successorof"></a> `successorOf?` | `number` | - | [packages/core/src/effects/fold.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L144) |
| <a id="property-terminal"></a> `terminal?` | \{ `causalRef?`: `number`; `reason?`: `string`; `seq`: `number`; `terminal`: [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md); \} | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| `terminal.causalRef?` | `number` | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| `terminal.reason?` | `string` | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| `terminal.seq` | `number` | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| `terminal.terminal` | [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md) | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| <a id="property-voidreason"></a> `voidReason?` | \{ `detail`: `string`; `reason`: [`EffectVoidReason`](/api/@rulvar/core/type-aliases/EffectVoidReason.md); \} | - | [packages/core/src/effects/fold.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L147) |
| `voidReason.detail` | `string` | - | [packages/core/src/effects/fold.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L147) |
| `voidReason.reason` | [`EffectVoidReason`](/api/@rulvar/core/type-aliases/EffectVoidReason.md) | - | [packages/core/src/effects/fold.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L147) |
