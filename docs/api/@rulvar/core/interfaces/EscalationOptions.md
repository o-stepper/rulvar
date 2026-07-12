[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationOptions

# Interface: EscalationOptions

Defined in: [packages/core/src/runtime/escalation.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L54)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deadlinems"></a> `deadlineMs?` | `number` | Flavor B suspension deadline; REQUIRED for flavor B (Appendix A). | [packages/core/src/runtime/escalation.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L58) |
| <a id="property-defaultdecision"></a> `defaultDecision?` | [`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md) | Applied by the timeout resolution (by: 'timeout'); default accept. | [packages/core/src/runtime/escalation.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L60) |
| <a id="property-flavor"></a> `flavor?` | `"A"` \| `"B"` | Default 'A'. | [packages/core/src/runtime/escalation.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L56) |
| <a id="property-minspendusd"></a> `minSpendUsd?` | `number` | In-run minimum spend before scope_bigger; default 0 (M3-T09). | [packages/core/src/runtime/escalation.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L62) |
