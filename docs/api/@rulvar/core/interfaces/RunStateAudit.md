[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L309)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L320) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L318) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L314) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L316) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L316) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L316) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:313](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L313) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L321) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L325) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L323) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L310) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:311](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L311) |
