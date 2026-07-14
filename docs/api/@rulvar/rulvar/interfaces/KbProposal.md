[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / KbProposal

# Interface: KbProposal

Defined in: `packages/core/dist/index.d.ts`

One orchestrator model-knowledge proposal (phase 3). A proposal is a
run-ledger record, NOT a claim: it lives ONLY in the RunLedger
section modelObservations, is never rendered into any prompt of any
run before the human gate (absolute quarantine, the note included),
and reaches the gate exclusively through LedgerExport. The engine
assembles it from the tier-relative kb_propose payload: the subject
model is resolved by the engine from the referenced lineage's
declared ladder, never named by the orchestrator; evidence must
resolve into the proposing run's own decision entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evidence"></a> `evidence` | \{ `entryRef`: `number`; `kind`: `"journal"`; `runId`: `string`; \}[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-note"></a> `note?` | `string` | <=200 chars; not rendered into any prompt before the gate. | `packages/core/dist/index.d.ts` |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | - | `packages/core/dist/index.d.ts` |
| `subject.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| `subject.model` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/rulvar/type-aliases/TaskClass.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-trigger"></a> `trigger` | [`KbProposalTrigger`](/api/@rulvar/rulvar/type-aliases/KbProposalTrigger.md) | - | `packages/core/dist/index.d.ts` |
