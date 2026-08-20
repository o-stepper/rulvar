[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:663](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L663)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:674](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L674) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:672](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L672) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:668](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L668) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:670](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L670) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:670](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L670) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:670](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L670) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:667](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L667) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:675](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L675) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:679](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L679) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:677](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L677) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:664](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L664) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:665](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L665) |
