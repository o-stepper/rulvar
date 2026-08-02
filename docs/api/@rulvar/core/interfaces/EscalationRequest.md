[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationRequest

# Interface: EscalationRequest

Defined in: [packages/core/src/runtime/escalation.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L77)

The model-facing request: the report minus the runtime-filled fields.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-blockers"></a> `blockers?` | `string`[] | [packages/core/src/runtime/escalation.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L81) |
| <a id="property-kind"></a> `kind` | [`EscalationKind`](/api/@rulvar/core/type-aliases/EscalationKind.md) | [packages/core/src/runtime/escalation.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L78) |
| <a id="property-proposeddecomposition"></a> `proposedDecomposition?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md)[] | [packages/core/src/runtime/escalation.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L82) |
| <a id="property-revisedestimate"></a> `revisedEstimate` | \{ `turns`: `number`; `usd`: `number`; \} | [packages/core/src/runtime/escalation.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L80) |
| `revisedEstimate.turns` | `number` | [packages/core/src/runtime/escalation.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L80) |
| `revisedEstimate.usd` | `number` | [packages/core/src/runtime/escalation.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L80) |
| <a id="property-scopedelta"></a> `scopeDelta` | `string` | [packages/core/src/runtime/escalation.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L79) |
