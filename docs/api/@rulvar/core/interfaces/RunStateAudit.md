[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:660](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L660)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:671](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L671) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:669](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L669) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L665) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:667](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L667) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:667](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L667) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:667](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L667) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:664](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L664) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:672](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L672) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:676](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L676) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:674](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L674) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:661](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L661) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:662](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L662) |
