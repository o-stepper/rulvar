[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TerminalPatch

# Interface: TerminalPatch

Defined in: [packages/core/src/journal/replayer.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L77)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts?` | `unknown` | Terminal agent entries: Artifact list. | [packages/core/src/journal/replayer.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L89) |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | [packages/core/src/journal/replayer.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L87) |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/core/type-aliases/WireError.md) | - | [packages/core/src/journal/replayer.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L80) |
| <a id="property-escalation"></a> `escalation?` | `unknown` | Terminal escalated entries: the validated EscalationReport. | [packages/core/src/journal/replayer.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L91) |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Engine-decided terminal abort classes (the no-progress abort) stamp memoizeOutcome on the TERMINAL entry so the frozen memoize rules replay them on every resume; the running entry keeps the user's policy verbatim (M3 amendment). | [packages/core/src/journal/replayer.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L98) |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | [packages/core/src/journal/replayer.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L83) |
| <a id="property-site"></a> `site?` | `string` | - | [packages/core/src/journal/replayer.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L99) |
| <a id="property-status"></a> `status` | `"error"` \| `"limit"` \| `"ok"` \| `"cancelled"` \| `"escalated"` | - | [packages/core/src/journal/replayer.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L78) |
| <a id="property-transcriptref"></a> `transcriptRef?` | `string` | - | [packages/core/src/journal/replayer.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L86) |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/journal/replayer.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L81) |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | [packages/core/src/journal/replayer.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L82) |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/core/interfaces/UsageSlice.md)[] | Set only when the call spanned several serving models; see JournalEntry. | [packages/core/src/journal/replayer.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L85) |
| <a id="property-value"></a> `value?` | `unknown` | - | [packages/core/src/journal/replayer.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/replayer.ts#L79) |
