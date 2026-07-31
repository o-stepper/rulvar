[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentInvocationRow

# Interface: AgentInvocationRow

Defined in: [packages/core/src/l0/telemetry-reduce.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L47)

One logical agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L49) |
| <a id="property-costbasis"></a> `costBasis` | [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702), from the span's agent:end; an absent field (a pre-RV702 stream, or a span still open) reduces to 'aggregate-estimate', never to a per-call claim it cannot back. | [packages/core/src/l0/telemetry-reduce.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L62) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L56) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L50) |
| <a id="property-open"></a> `open` | `boolean` | True when the span's agent:end never arrived. | [packages/core/src/l0/telemetry-reduce.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L72) |
| <a id="property-phases"></a> `phases` | [`PhaseRow`](/api/@rulvar/core/interfaces/PhaseRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L73) |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L70) |
| <a id="property-retrycount"></a> `retryCount` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L64) |
| <a id="property-role"></a> `role?` | `string` | The primary role from agent:start. | [packages/core/src/l0/telemetry-reduce.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L52) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L48) |
| <a id="property-status"></a> `status?` | `string` | From agent:end; absent while the span is open. | [packages/core/src/l0/telemetry-reduce.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L54) |
| <a id="property-toolbudget"></a> `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304), carried through from the live agent:end. Absent on replayed rows and unbounded loops. | [packages/core/src/l0/telemetry-reduce.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L69) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/telemetry-reduce.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L55) |
| <a id="property-usageapprox"></a> `usageApprox` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L63) |
