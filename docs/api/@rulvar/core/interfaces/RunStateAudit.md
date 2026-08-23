[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:736](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L736)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:747](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L747) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:745](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L745) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:741](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L741) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:743](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L743) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:743](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L743) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:743](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L743) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:740](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L740) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:748](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L748) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:752](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L752) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:750](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L750) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:737](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L737) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:738](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L738) |
