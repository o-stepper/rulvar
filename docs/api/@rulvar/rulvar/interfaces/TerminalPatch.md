[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TerminalPatch

# Interface: TerminalPatch

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts?` | `unknown` | Terminal agent entries: Artifact list. | `packages/core/dist/index.d.ts` |
| <a id="property-checkpointref"></a> `checkpointRef?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-error"></a> `error?` | [`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-escalation"></a> `escalation?` | `unknown` | Terminal escalated entries: the validated EscalationReport. | `packages/core/dist/index.d.ts` |
| <a id="property-memoizeoutcome"></a> `memoizeOutcome?` | `boolean` | Engine-decided terminal abort classes (the no-progress abort) stamp memoizeOutcome on the TERMINAL entry so the frozen memoize rules replay them on every resume; the running entry keeps the user's policy verbatim (M3 amendment). | `packages/core/dist/index.d.ts` |
| <a id="property-servedby"></a> `servedBy?` | `` `${string}:${string}` `` | - | `packages/core/dist/index.d.ts` |
| <a id="property-site"></a> `site?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `"ok"` \| `"error"` \| `"limit"` \| `"cancelled"` \| `"escalated"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-transcriptref"></a> `transcriptRef?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage?` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox?` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-usagebymodel"></a> `usageByModel?` | [`UsageSlice`](/api/@rulvar/rulvar/interfaces/UsageSlice.md)[] | Set only when the call spanned several serving models; see JournalEntry. | `packages/core/dist/index.d.ts` |
| <a id="property-value"></a> `value?` | `unknown` | - | `packages/core/dist/index.d.ts` |
