[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: [packages/core/src/stores/reconcile.ts:858](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L858)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | [packages/core/src/stores/reconcile.ts:869](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L869) |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | [packages/core/src/stores/reconcile.ts:867](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L867) |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | [packages/core/src/stores/reconcile.ts:863](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L863) |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | [packages/core/src/stores/reconcile.ts:865](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L865) |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | - | [packages/core/src/stores/reconcile.ts:865](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L865) |
| `journalSettle.seq` | `number` | - | [packages/core/src/stores/reconcile.ts:865](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L865) |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | [packages/core/src/stores/reconcile.ts:862](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L862) |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | [packages/core/src/stores/reconcile.ts:870](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L870) |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | [packages/core/src/stores/reconcile.ts:874](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L874) |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/core/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | [packages/core/src/stores/reconcile.ts:872](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L872) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/stores/reconcile.ts:859](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L859) |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/core/type-aliases/RunAuditVerdict.md) | - | [packages/core/src/stores/reconcile.ts:860](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L860) |
