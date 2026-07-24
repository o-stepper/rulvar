[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalPatch

# Interface: TerminalPatch

Defined in: [packages/core/src/journal/replayer.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L95)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts?` | `unknown` | Terminal agent entries: Artifact list. | [packages/core/src/journal/replayer.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L113) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/replayer.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L111) |
| <a id="property-costattribution"></a> `costAttribution?` | [`CostAttributionFacts`](/api/@rulvar/core/interfaces/CostAttributionFacts.md) | Attribution facts behind the CostReport breakdowns; see JournalEntry. | [packages/core/src/journal/replayer.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L105) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/journal/replayer.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L98) |
| <a id="property-escalation"></a> `escalation?` | `unknown` | Terminal escalated entries: the validated EscalationReport. | [packages/core/src/journal/replayer.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L115) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Engine-decided terminal abort classes (the no-progress abort) stamp memoizeOutcome on the TERMINAL entry so the frozen memoize rules replay them on every resume; the running entry keeps the user's policy verbatim (M3 amendment). | [packages/core/src/journal/replayer.ts:122](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L122) |
| <a id="property-providercalls"></a> `providerCalls?` | [`ProviderCallRecord`](/api/@rulvar/core/interfaces/ProviderCallRecord.md)[] | The per-dispatch reconciliation ledger (P1.3); see JournalEntry. | [packages/core/src/journal/replayer.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L107) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | [packages/core/src/journal/replayer.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L101) |
| <a id="property-site"></a> `site?` | `string` | - | [packages/core/src/journal/replayer.ts:123](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L123) |
| <a id="property-status"></a> `status` | `"error"` \| `"limit"` \| `"ok"` \| `"cancelled"` \| `"escalated"` | - | [packages/core/src/journal/replayer.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L96) |
| <a id="property-transcriptref"></a> `transcriptRef?` | `string` | - | [packages/core/src/journal/replayer.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L110) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/journal/replayer.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L99) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/journal/replayer.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L100) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Set only when the call spanned several serving models; see JournalEntry. | [packages/core/src/journal/replayer.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L103) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | The serving adapter's usage-semantics version; see JournalEntry. | [packages/core/src/journal/replayer.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L109) |
| <a id="property-value"></a> `value?` | `unknown` | - | [packages/core/src/journal/replayer.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L97) |
