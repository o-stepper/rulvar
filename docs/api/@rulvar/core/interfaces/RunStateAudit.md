[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:827](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L827)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:838](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L838) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:836](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L836) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:832](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L832) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:834](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L834) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:834](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L834) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:834](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L834) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:831](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L831) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:839](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L839) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:843](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L843) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:841](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L841) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:828](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L828) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:829](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L829) |
