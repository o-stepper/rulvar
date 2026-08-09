[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L237)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L248) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:246](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L246) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L242) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L244) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L244) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:244](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L244) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:241](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L241) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L249) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L253) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L251) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L238) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L239) |
