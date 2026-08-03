[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L90)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L101) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L99) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L95) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L97) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L97) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L97) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L94) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L102) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L106) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L104) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L91) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L92) |
