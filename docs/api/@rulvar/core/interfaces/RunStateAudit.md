[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L76)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L87) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L85) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L81) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L83) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L83) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L83) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L80) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L88) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L92) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L90) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L77) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L78) |
