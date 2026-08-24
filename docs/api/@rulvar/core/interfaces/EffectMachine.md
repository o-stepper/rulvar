[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectMachine

# Interface: EffectMachine

Defined in: [packages/core/src/effects/fold.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L144)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvalref"></a> `approvalRef` | `number` | - | [packages/core/src/effects/fold.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L150) |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | [packages/core/src/effects/fold.ts:155](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L155) |
| <a id="property-artifacthash"></a> `artifactHash?` | `string` | - | [packages/core/src/effects/fold.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L156) |
| <a id="property-at"></a> `at` | `string` | The intent entry's startedAt instant. | [packages/core/src/effects/fold.ts:147](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L147) |
| <a id="property-attempts"></a> `attempts` | [`EffectAttemptState`](/api/@rulvar/core/interfaces/EffectAttemptState.md)[] | - | [packages/core/src/effects/fold.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L165) |
| <a id="property-budgets"></a> `budgets` | [`EffectBudgets`](/api/@rulvar/core/interfaces/EffectBudgets.md) | - | [packages/core/src/effects/fold.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L158) |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/core/type-aliases/EffectCapabilityRow.md) | - | [packages/core/src/effects/fold.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L153) |
| <a id="property-compensatedby"></a> `compensatedBy?` | `number` | The confirmed compensation citing this intent (derived overlay). | [packages/core/src/effects/fold.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L176) |
| <a id="property-compensates"></a> `compensates?` | `number` | - | [packages/core/src/effects/fold.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L159) |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | - | [packages/core/src/effects/fold.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L157) |
| <a id="property-consumed"></a> `consumed` | `boolean` | True when the consumption fold licensed the intent. | [packages/core/src/effects/fold.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L162) |
| <a id="property-dispositions"></a> `dispositions` | [`EffectDispositionState`](/api/@rulvar/core/interfaces/EffectDispositionState.md)[] | - | [packages/core/src/effects/fold.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L168) |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/core/type-aliases/EffectClass.md) | - | [packages/core/src/effects/fold.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L152) |
| <a id="property-epochref"></a> `epochRef` | `number` | - | [packages/core/src/effects/fold.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L151) |
| <a id="property-incidents"></a> `incidents` | [`EffectIncidentState`](/api/@rulvar/core/interfaces/EffectIncidentState.md)[] | - | [packages/core/src/effects/fold.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L167) |
| <a id="property-intentseq"></a> `intentSeq` | `number` | - | [packages/core/src/effects/fold.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L145) |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | [packages/core/src/effects/fold.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L149) |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/core/type-aliases/EffectLookupQualification.md) | - | [packages/core/src/effects/fold.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L154) |
| <a id="property-opid"></a> `opId` | `string` | - | [packages/core/src/effects/fold.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L148) |
| <a id="property-pendingconflict"></a> `pendingConflict?` | \{ `detail`: `string`; `seq`: `number`; \} | A pre-terminal conflicting receipt awaiting the quarantine append. | [packages/core/src/effects/fold.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L172) |
| `pendingConflict.detail` | `string` | - | [packages/core/src/effects/fold.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L172) |
| `pendingConflict.seq` | `number` | - | [packages/core/src/effects/fold.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L172) |
| <a id="property-postintentcloser"></a> `postIntentCloser?` | [`PostIntentCloser`](/api/@rulvar/core/interfaces/PostIntentCloser.md) | Set at finalize; re-dispatch is disabled from this position on. | [packages/core/src/effects/fold.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L174) |
| <a id="property-probes"></a> `probes` | [`EffectProbeState`](/api/@rulvar/core/interfaces/EffectProbeState.md)[] | - | [packages/core/src/effects/fold.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L169) |
| <a id="property-receipts"></a> `receipts` | [`EffectReceiptState`](/api/@rulvar/core/interfaces/EffectReceiptState.md)[] | - | [packages/core/src/effects/fold.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L166) |
| <a id="property-state"></a> `state` | [`EffectMachineState`](/api/@rulvar/core/type-aliases/EffectMachineState.md) | - | [packages/core/src/effects/fold.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L164) |
| <a id="property-successorof"></a> `successorOf?` | `number` | - | [packages/core/src/effects/fold.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L160) |
| <a id="property-terminal"></a> `terminal?` | \{ `causalRef?`: `number`; `reason?`: `string`; `seq`: `number`; `terminal`: [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md); \} | - | [packages/core/src/effects/fold.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L170) |
| `terminal.causalRef?` | `number` | - | [packages/core/src/effects/fold.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L170) |
| `terminal.reason?` | `string` | - | [packages/core/src/effects/fold.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L170) |
| `terminal.seq` | `number` | - | [packages/core/src/effects/fold.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L170) |
| `terminal.terminal` | [`EffectTerminalState`](/api/@rulvar/core/type-aliases/EffectTerminalState.md) | - | [packages/core/src/effects/fold.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L170) |
| <a id="property-voidreason"></a> `voidReason?` | \{ `detail`: `string`; `reason`: [`EffectVoidReason`](/api/@rulvar/core/type-aliases/EffectVoidReason.md); \} | - | [packages/core/src/effects/fold.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L163) |
| `voidReason.detail` | `string` | - | [packages/core/src/effects/fold.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L163) |
| `voidReason.reason` | [`EffectVoidReason`](/api/@rulvar/core/type-aliases/EffectVoidReason.md) | - | [packages/core/src/effects/fold.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L163) |
