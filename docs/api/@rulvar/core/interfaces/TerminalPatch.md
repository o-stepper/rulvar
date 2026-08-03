[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalPatch

# Interface: TerminalPatch

Defined in: [packages/core/src/journal/replayer.ts:156](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L156)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts?` | `unknown` | Terminal agent entries: Artifact list. | [packages/core/src/journal/replayer.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L174) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/replayer.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L172) |
| <a id="property-costattribution"></a> `costAttribution?` | [`CostAttributionFacts`](/api/@rulvar/core/interfaces/CostAttributionFacts.md) | Attribution facts behind the CostReport breakdowns; see JournalEntry. | [packages/core/src/journal/replayer.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L166) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/journal/replayer.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L159) |
| <a id="property-escalation"></a> `escalation?` | `unknown` | Terminal escalated entries: the validated EscalationReport. | [packages/core/src/journal/replayer.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L180) |
| <a id="property-evidence"></a> `evidence?` | \{ `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; \} | Terminal agent entries: the evidence verdict; see JournalEntry. | [packages/core/src/journal/replayer.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L176) |
| `evidence.met` | `boolean` | - | [packages/core/src/journal/replayer.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L176) |
| `evidence.minEntries` | `number` | - | [packages/core/src/journal/replayer.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L176) |
| `evidence.recordedEntries` | `number` | - | [packages/core/src/journal/replayer.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L176) |
| <a id="property-evidenceentries"></a> `evidenceEntries?` | \{ `citation?`: `string`; `claim`: `string`; \}[] | Terminal agent entries: recorded evidence entry content; see JournalEntry. | [packages/core/src/journal/replayer.ts:178](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L178) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Engine-decided terminal abort classes (the no-progress abort) stamp memoizeOutcome on the TERMINAL entry so the frozen memoize rules replay them on every resume; the running entry keeps the user's policy verbatim (M3 amendment). | [packages/core/src/journal/replayer.ts:187](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L187) |
| <a id="property-providercalls"></a> `providerCalls?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md)[] | The per-dispatch reconciliation ledger (P1.3); see JournalEntry. | [packages/core/src/journal/replayer.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L168) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | [packages/core/src/journal/replayer.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L162) |
| <a id="property-site"></a> `site?` | `string` | - | [packages/core/src/journal/replayer.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L188) |
| <a id="property-status"></a> `status` | `"error"` \| `"limit"` \| `"ok"` \| `"cancelled"` \| `"escalated"` | - | [packages/core/src/journal/replayer.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L157) |
| <a id="property-transcriptref"></a> `transcriptRef?` | `string` | - | [packages/core/src/journal/replayer.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L171) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/journal/replayer.ts:160](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L160) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/journal/replayer.ts:161](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L161) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Set only when the call spanned several serving models; see JournalEntry. | [packages/core/src/journal/replayer.ts:164](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L164) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | The serving adapter's usage-semantics version; see JournalEntry. | [packages/core/src/journal/replayer.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L170) |
| <a id="property-value"></a> `value?` | `unknown` | - | [packages/core/src/journal/replayer.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L158) |
