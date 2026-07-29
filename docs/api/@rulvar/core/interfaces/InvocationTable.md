[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvocationTable

# Interface: InvocationTable

Defined in: [packages/core/src/l0/telemetry-reduce.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L88)

The reduced table plus the per-role aggregate across every span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | [`AgentInvocationRow`](/api/@rulvar/core/interfaces/AgentInvocationRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L89) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;`string`, \{ `costBasis`: [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md); `costUsd`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}\&gt; | Aggregated over COMPLETED phase pairs, keyed by role. The bucket's `costBasis` is 'per-call' only while EVERY folded pair carried the per-call basis; one aggregate-estimate pair degrades the bucket. | [packages/core/src/l0/telemetry-reduce.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L95) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Sum of agent:end costUsd over settled spans. | [packages/core/src/l0/telemetry-reduce.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L97) |
