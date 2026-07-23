[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvocationTable

# Interface: InvocationTable

Defined in: [packages/core/src/l0/telemetry-reduce.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L71)

The reduced table plus the per-role aggregate across every span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | [`AgentInvocationRow`](/api/@rulvar/core/interfaces/AgentInvocationRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L72) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;`string`, \{ `costUsd`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}\&gt; | Aggregated over COMPLETED phase pairs, keyed by role. | [packages/core/src/l0/telemetry-reduce.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L74) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Sum of agent:end costUsd over settled spans. | [packages/core/src/l0/telemetry-reduce.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L76) |
