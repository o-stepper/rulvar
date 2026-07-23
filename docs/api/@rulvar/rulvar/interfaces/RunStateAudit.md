[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RunStateAudit

# Interface: RunStateAudit

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-danglingdispatches"></a> `danglingDispatches` | `number` | Running dispatch entries no terminal ever referenced. | `packages/core/dist/index.d.ts` |
| <a id="property-entriesaftersettle"></a> `entriesAfterSettle` | `number` | Entries appended after the last journaled settle. | `packages/core/dist/index.d.ts` |
| <a id="property-journalentries"></a> `journalEntries` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-journalsettle"></a> `journalSettle?` | \{ `runStatus`: [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md); `seq`: `number`; \} | The last journaled settle, when the journal carries one. | `packages/core/dist/index.d.ts` |
| `journalSettle.runStatus` | [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md) | - | `packages/core/dist/index.d.ts` |
| `journalSettle.seq` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-meta"></a> `meta?` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) | The stored meta row; absent when the store has none. | `packages/core/dist/index.d.ts` |
| <a id="property-opensuspensions"></a> `openSuspensions` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-reason"></a> `reason` | `string` | One sentence naming the evidence behind the verdict. | `packages/core/dist/index.d.ts` |
| <a id="property-repairto"></a> `repairTo?` | [`RunStatus`](/api/@rulvar/rulvar/type-aliases/RunStatus.md) | The status a repair would write; absent when no repair is sound. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-verdict"></a> `verdict` | [`RunAuditVerdict`](/api/@rulvar/rulvar/type-aliases/RunAuditVerdict.md) | - | `packages/core/dist/index.d.ts` |
