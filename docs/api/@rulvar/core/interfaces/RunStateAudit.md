[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:493](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L493)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:504](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L504) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:502](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L502) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L498) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L500) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:497](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L497) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:505](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L505) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L509) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:507](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L507) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:494](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L494) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:495](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L495) |
