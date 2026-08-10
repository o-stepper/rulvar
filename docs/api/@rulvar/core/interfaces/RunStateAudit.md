[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:596](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L596)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:607](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L607) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L605) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L601) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L603) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L603) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L603) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:600](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L600) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:608](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L608) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:612](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L612) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:610](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L610) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:597](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L597) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:598](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L598) |
