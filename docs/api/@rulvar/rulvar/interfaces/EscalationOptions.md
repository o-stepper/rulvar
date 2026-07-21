[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EscalationOptions

# Interface: EscalationOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deadlinems"></a> `deadlineMs?` | `number` | Flavor B suspension deadline; REQUIRED for flavor B (Appendix A). | `packages/core/dist/index.d.ts` |
| <a id="property-defaultdecision"></a> `defaultDecision?` | [`EscalationDecision`](/api/@rulvar/rulvar/type-aliases/EscalationDecision.md) | Applied by the timeout resolution (by: 'timeout'); default accept. | `packages/core/dist/index.d.ts` |
| <a id="property-flavor"></a> `flavor?` | `"A"` \| `"B"` | Default 'A'. | `packages/core/dist/index.d.ts` |
| <a id="property-minspendusd"></a> `minSpendUsd?` | `number` | In-run minimum spend before scope_bigger; default 0 (M3-T09). A finite number >= 0, validated before any LLM call: the gate compares spend against it, and a NaN would silently disable it. | `packages/core/dist/index.d.ts` |
