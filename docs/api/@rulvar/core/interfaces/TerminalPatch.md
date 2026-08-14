[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalPatch

# Interface: TerminalPatch

Defined in: [packages/core/src/journal/replayer.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L161)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts?` | `unknown` | Terminal agent entries: Artifact list. | [packages/core/src/journal/replayer.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L179) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/replayer.ts:177](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L177) |
| <a id="property-costattribution"></a> `costAttribution?` | [`CostAttributionFacts`](/api/@rulvar/core/interfaces/CostAttributionFacts.md) | Attribution facts behind the CostReport breakdowns; see JournalEntry. | [packages/core/src/journal/replayer.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L171) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/journal/replayer.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L164) |
| <a id="property-escalation"></a> `escalation?` | `unknown` | Terminal escalated entries: the validated EscalationReport. | [packages/core/src/journal/replayer.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L189) |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | Terminal agent entries: the evidence verdict; see JournalEntry. | [packages/core/src/journal/replayer.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L181) |
| `evidence.met` | `boolean` | - | [packages/core/src/journal/replayer.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L181) |
| `evidence.minEntries` | `number` | - | [packages/core/src/journal/replayer.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L181) |
| `evidence.recordedEntries` | `number` | - | [packages/core/src/journal/replayer.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L181) |
| <a id="property-evidenceentries"></a> `evidenceEntries?` | \{ `citation?`: `string`; `claim`: `string`; \}[] | Terminal agent entries: recorded evidence entry content; see JournalEntry. | [packages/core/src/journal/replayer.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L183) |
| <a id="property-hostrejected"></a> `hostRejected?` | `boolean` | Terminal agent entries: the host finish rejection stamp (RV3702); see JournalEntry. | [packages/core/src/journal/replayer.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L187) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Engine-decided terminal abort classes (the no-progress abort) stamp memoizeOutcome on the TERMINAL entry so the frozen memoize rules replay them on every resume; the running entry keeps the user's policy verbatim (M3 amendment). | [packages/core/src/journal/replayer.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L196) |
| <a id="property-providercalls"></a> `providerCalls?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md)[] | The per-dispatch reconciliation ledger (P1.3); see JournalEntry. | [packages/core/src/journal/replayer.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L173) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | [packages/core/src/journal/replayer.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L167) |
| <a id="property-site"></a> `site?` | `string` | - | [packages/core/src/journal/replayer.ts:197](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L197) |
| <a id="property-status"></a> `status` | `"error"` \| `"limit"` \| `"ok"` \| `"cancelled"` \| `"escalated"` | - | [packages/core/src/journal/replayer.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L162) |
| <a id="property-toolbudget"></a> `toolBudget?` | \{ `cap?`: `number`; `used`: `number`; \} | Terminal agent entries: the durable tool-budget subset; see JournalEntry. | [packages/core/src/journal/replayer.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L185) |
| `toolBudget.cap?` | `number` | - | [packages/core/src/journal/replayer.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L185) |
| `toolBudget.used` | `number` | - | [packages/core/src/journal/replayer.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L185) |
| <a id="property-transcriptref"></a> `transcriptRef?` | `string` | - | [packages/core/src/journal/replayer.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L176) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/journal/replayer.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L165) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/journal/replayer.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L166) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Set only when the call spanned several serving models; see JournalEntry. | [packages/core/src/journal/replayer.ts:169](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L169) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | The serving adapter's usage-semantics version; see JournalEntry. | [packages/core/src/journal/replayer.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L175) |
| <a id="property-value"></a> `value?` | `unknown` | - | [packages/core/src/journal/replayer.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L163) |
