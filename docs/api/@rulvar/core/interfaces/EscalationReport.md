[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EscalationReport

# Interface: EscalationReport

Defined in: [packages/core/src/runtime/escalation.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L38)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-blockers"></a> `blockers` | `string`[] | - | [packages/core/src/runtime/escalation.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L42) |
| <a id="property-costtodate"></a> `costToDate` | \{ `turns`: `number`; `usd`: `number`; \} | Runtime-filled; model-authored values are rejected at validation. | [packages/core/src/runtime/escalation.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L45) |
| `costToDate.turns` | `number` | - | [packages/core/src/runtime/escalation.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L45) |
| `costToDate.usd` | `number` | - | [packages/core/src/runtime/escalation.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L45) |
| <a id="property-kind"></a> `kind` | [`EscalationKind`](/api/@rulvar/core/type-aliases/EscalationKind.md) | - | [packages/core/src/runtime/escalation.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L39) |
| <a id="property-proposeddecomposition"></a> `proposedDecomposition` | [`Json`](/api/@rulvar/core/type-aliases/Json.md)[] | - | [packages/core/src/runtime/escalation.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L43) |
| <a id="property-revisedestimate"></a> `revisedEstimate` | \{ `turns`: `number`; `usd`: `number`; \} | - | [packages/core/src/runtime/escalation.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L41) |
| `revisedEstimate.turns` | `number` | - | [packages/core/src/runtime/escalation.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L41) |
| `revisedEstimate.usd` | `number` | - | [packages/core/src/runtime/escalation.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L41) |
| <a id="property-salvage"></a> `salvage` | \{ `artifacts`: `string`[]; `transcriptRef`: `string`; `worktreePatchRef?`: `string`; \} | Runtime-filled; model-authored values are rejected at validation. | [packages/core/src/runtime/escalation.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L47) |
| `salvage.artifacts` | `string`[] | - | [packages/core/src/runtime/escalation.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L47) |
| `salvage.transcriptRef` | `string` | - | [packages/core/src/runtime/escalation.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L47) |
| `salvage.worktreePatchRef?` | `string` | - | [packages/core/src/runtime/escalation.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L47) |
| <a id="property-scopedelta"></a> `scopeDelta` | `string` | - | [packages/core/src/runtime/escalation.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/escalation.ts#L40) |
