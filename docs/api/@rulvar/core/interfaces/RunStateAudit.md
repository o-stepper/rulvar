[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:576](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L576)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:587](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L587) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:585](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L585) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:581](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L581) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:583](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L583) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:583](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L583) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:583](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L583) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:580](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L580) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:588](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L588) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:592](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L592) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:590](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L590) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:577](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L577) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:578](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L578) |
