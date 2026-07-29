[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentInvocationRow

# Interface: AgentInvocationRow

Defined in: [packages/core/src/l0/telemetry-reduce.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L58)

One logical agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L60) |
| <a id="property-costbasis"></a> `costBasis` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702), from the span's agent:end; an absent field (a pre-RV702 stream, or a span still open) reduces to 'aggregate-estimate', never to a per-call claim it cannot back. | [packages/core/src/l0/telemetry-reduce.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L73) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L67) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L61) |
| <a id="property-open"></a> `open` | `boolean` | True when the span's agent:end never arrived. | [packages/core/src/l0/telemetry-reduce.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L83) |
| <a id="property-phases"></a> `phases` | [`PhaseRow`](/api/@rulvar/core/interfaces/PhaseRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L84) |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L81) |
| <a id="property-retrycount"></a> `retryCount` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L75) |
| <a id="property-role"></a> `role?` | `string` | The primary role from agent:start. | [packages/core/src/l0/telemetry-reduce.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L63) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L59) |
| <a id="property-status"></a> `status?` | `string` | From agent:end; absent while the span is open. | [packages/core/src/l0/telemetry-reduce.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L65) |
| <a id="property-toolbudget"></a> `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304), carried through from the live agent:end. Absent on replayed rows and unbounded loops. | [packages/core/src/l0/telemetry-reduce.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L80) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/telemetry-reduce.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L66) |
| <a id="property-usageapprox"></a> `usageApprox` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L74) |
