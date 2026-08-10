[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:331](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L331)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L342) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L340) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L336) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L338) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L338) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L338) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L335) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L343) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L347) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L345) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L332) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L333) |
