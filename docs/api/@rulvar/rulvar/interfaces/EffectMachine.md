[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectMachine

# Interface: EffectMachine

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvalref"></a> `approvalRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-argumentshash"></a> `argumentsHash` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-artifacthash"></a> `artifactHash?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-attempts"></a> `attempts` | [`EffectAttemptState`](/api/@rulvar/rulvar/interfaces/EffectAttemptState.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-budgets"></a> `budgets` | [`EffectBudgets`](/api/@rulvar/rulvar/interfaces/EffectBudgets.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-capabilityrow"></a> `capabilityRow` | [`EffectCapabilityRow`](/api/@rulvar/rulvar/type-aliases/EffectCapabilityRow.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-compensatedby"></a> `compensatedBy?` | `number` | The confirmed compensation citing this intent (derived overlay). | `packages/core/dist/index.d.ts` |
| <a id="property-compensates"></a> `compensates?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-configfingerprint"></a> `configFingerprint?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-consumed"></a> `consumed` | `boolean` | True when the consumption fold licensed the intent. | `packages/core/dist/index.d.ts` |
| <a id="property-dispositions"></a> `dispositions` | [`EffectDispositionState`](/api/@rulvar/rulvar/interfaces/EffectDispositionState.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-effectclass"></a> `effectClass` | [`EffectClass`](/api/@rulvar/rulvar/type-aliases/EffectClass.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-epochref"></a> `epochRef` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-incidents"></a> `incidents` | [`EffectIncidentState`](/api/@rulvar/rulvar/interfaces/EffectIncidentState.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-intentseq"></a> `intentSeq` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-logicalkey"></a> `logicalKey` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-lookupqualification"></a> `lookupQualification?` | [`EffectLookupQualification`](/api/@rulvar/rulvar/type-aliases/EffectLookupQualification.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-opid"></a> `opId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-pendingconflict"></a> `pendingConflict?` | \{ `detail`: `string`; `seq`: `number`; \} | A pre-terminal conflicting receipt awaiting the quarantine append. | `packages/core/dist/index.d.ts` |
| `pendingConflict.detail` | `string` | - | `packages/core/dist/index.d.ts` |
| `pendingConflict.seq` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-postintentcloser"></a> `postIntentCloser?` | [`PostIntentCloser`](/api/@rulvar/rulvar/interfaces/PostIntentCloser.md) | Set at finalize; re-dispatch is disabled from this position on. | `packages/core/dist/index.d.ts` |
| <a id="property-receipts"></a> `receipts` | [`EffectReceiptState`](/api/@rulvar/rulvar/interfaces/EffectReceiptState.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-state"></a> `state` | [`EffectMachineState`](/api/@rulvar/rulvar/type-aliases/EffectMachineState.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-successorof"></a> `successorOf?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-terminal"></a> `terminal?` | \{ `causalRef?`: `number`; `reason?`: `string`; `seq`: `number`; `terminal`: [`EffectTerminalState`](/api/@rulvar/rulvar/type-aliases/EffectTerminalState.md); \} | - | `packages/core/dist/index.d.ts` |
| `terminal.causalRef?` | `number` | - | `packages/core/dist/index.d.ts` |
| `terminal.reason?` | `string` | - | `packages/core/dist/index.d.ts` |
| `terminal.seq` | `number` | - | `packages/core/dist/index.d.ts` |
| `terminal.terminal` | [`EffectTerminalState`](/api/@rulvar/rulvar/type-aliases/EffectTerminalState.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-voidreason"></a> `voidReason?` | \{ `detail`: `string`; `reason`: [`EffectVoidReason`](/api/@rulvar/rulvar/type-aliases/EffectVoidReason.md); \} | - | `packages/core/dist/index.d.ts` |
| `voidReason.detail` | `string` | - | `packages/core/dist/index.d.ts` |
| `voidReason.reason` | [`EffectVoidReason`](/api/@rulvar/rulvar/type-aliases/EffectVoidReason.md) | - | `packages/core/dist/index.d.ts` |
