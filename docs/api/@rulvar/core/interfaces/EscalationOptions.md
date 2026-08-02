[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationOptions

# Interface: EscalationOptions

Defined in: [packages/core/src/runtime/escalation.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L54)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deadlinems"></a> `deadlineMs?` | `number` | Flavor B suspension deadline; REQUIRED for flavor B (Appendix A). | [packages/core/src/runtime/escalation.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L58) |
| <a id="property-defaultdecision"></a> `defaultDecision?` | [`EscalationDecision`](/api/@rulvar/core/type-aliases/EscalationDecision.md) | Applied by the timeout resolution (by: 'timeout'); REQUIRED for flavor B since RV1506: the deadline's expiry applies it, and the historical engine default of accept resolved an unattended scope escalation fail open. Declare what a timeout means ({ kind: 'cancel' } is the conservative posture); there is no engine default anymore. | [packages/core/src/runtime/escalation.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L67) |
| <a id="property-flavor"></a> `flavor?` | `"A"` \| `"B"` | Default 'A'. | [packages/core/src/runtime/escalation.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L56) |
| <a id="property-minspendusd"></a> `minSpendUsd?` | `number` | In-run minimum spend before scope_bigger; default 0 (M3-T09). A finite number >= 0, validated before any LLM call: the gate compares spend against it, and a NaN would silently disable it. | [packages/core/src/runtime/escalation.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L73) |
