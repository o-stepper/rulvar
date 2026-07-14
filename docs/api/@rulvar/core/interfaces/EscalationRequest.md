[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationRequest

# Interface: EscalationRequest

Defined in: [packages/core/src/runtime/escalation.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L66)

The model-facing request: the report minus the runtime-filled fields.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-blockers"></a> `blockers?` | `string`[] | [packages/core/src/runtime/escalation.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L70) |
| <a id="property-kind"></a> `kind` | [`EscalationKind`](/api/@rulvar/core/type-aliases/EscalationKind.md) | [packages/core/src/runtime/escalation.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L67) |
| <a id="property-proposeddecomposition"></a> `proposedDecomposition?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md)[] | [packages/core/src/runtime/escalation.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L71) |
| <a id="property-revisedestimate"></a> `revisedEstimate` | \{ `turns`: `number`; `usd`: `number`; \} | [packages/core/src/runtime/escalation.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L69) |
| `revisedEstimate.turns` | `number` | [packages/core/src/runtime/escalation.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L69) |
| `revisedEstimate.usd` | `number` | [packages/core/src/runtime/escalation.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L69) |
| <a id="property-scopedelta"></a> `scopeDelta` | `string` | [packages/core/src/runtime/escalation.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L68) |
