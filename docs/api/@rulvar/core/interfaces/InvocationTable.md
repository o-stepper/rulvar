[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvocationTable

# Interface: InvocationTable

Defined in: [packages/core/src/l0/telemetry-reduce.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L76)

The reduced table plus the per-role aggregate across every span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | [`AgentInvocationRow`](/api/@rulvar/core/interfaces/AgentInvocationRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L77) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;`string`, \{ `costUsd`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}\&gt; | Aggregated over COMPLETED phase pairs, keyed by role. | [packages/core/src/l0/telemetry-reduce.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L79) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Sum of agent:end costUsd over settled spans. | [packages/core/src/l0/telemetry-reduce.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L81) |
