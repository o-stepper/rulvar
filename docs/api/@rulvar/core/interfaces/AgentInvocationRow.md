[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentInvocationRow

# Interface: AgentInvocationRow

Defined in: [packages/core/src/l0/telemetry-reduce.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L52)

One logical agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L54) |
| <a id="property-costusd"></a> `costUsd` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L61) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L55) |
| <a id="property-open"></a> `open` | `boolean` | True when the span's agent:end never arrived. | [packages/core/src/l0/telemetry-reduce.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L71) |
| <a id="property-phases"></a> `phases` | [`PhaseRow`](/api/@rulvar/core/interfaces/PhaseRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L72) |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L69) |
| <a id="property-retrycount"></a> `retryCount` | `number` | - | [packages/core/src/l0/telemetry-reduce.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L63) |
| <a id="property-role"></a> `role?` | `string` | The primary role from agent:start. | [packages/core/src/l0/telemetry-reduce.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L57) |
| <a id="property-spanid"></a> `spanId` | `string` | - | [packages/core/src/l0/telemetry-reduce.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L53) |
| <a id="property-status"></a> `status?` | `string` | From agent:end; absent while the span is open. | [packages/core/src/l0/telemetry-reduce.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L59) |
| <a id="property-toolbudget"></a> `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/core/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304), carried through from the live agent:end. Absent on replayed rows and unbounded loops. | [packages/core/src/l0/telemetry-reduce.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L68) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/telemetry-reduce.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L60) |
| <a id="property-usageapprox"></a> `usageApprox` | `boolean` | - | [packages/core/src/l0/telemetry-reduce.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L62) |
