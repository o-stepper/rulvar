[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KbProposal

# Interface: KbProposal

Defined in: [packages/core/src/l0/spi/knowledge.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L162)

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
| <a id="property-evidence"></a> `evidence` | \{ `entryRef`: `number`; `kind`: `"journal"`; `runId`: `string`; \}[] | - | [packages/core/src/l0/spi/knowledge.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L167) |
| <a id="property-note"></a> `note?` | `string` | <=200 chars; not rendered into any prompt before the gate. | [packages/core/src/l0/spi/knowledge.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L169) |
| <a id="property-polarity"></a> `polarity` | `"strength"` \| `"weakness"` | - | [packages/core/src/l0/spi/knowledge.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L165) |
| <a id="property-subject"></a> `subject` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `model`: `` `${string}:${string}` ``; \} | - | [packages/core/src/l0/spi/knowledge.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L163) |
| `subject.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/l0/spi/knowledge.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L163) |
| `subject.model` | `` `${string}:${string}` `` | - | [packages/core/src/l0/spi/knowledge.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L163) |
| <a id="property-taskclass"></a> `taskClass` | [`TaskClass`](/api/@rulvar/core/type-aliases/TaskClass.md) | - | [packages/core/src/l0/spi/knowledge.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L164) |
| <a id="property-trigger"></a> `trigger` | [`KbProposalTrigger`](/api/@rulvar/core/type-aliases/KbProposalTrigger.md) | - | [packages/core/src/l0/spi/knowledge.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L166) |
