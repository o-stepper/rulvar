[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / InvocationTable

# Interface: InvocationTable

Defined in: [packages/core/src/l0/telemetry-reduce.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L85)

The reduced table plus the per-role aggregate across every span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | [`AgentInvocationRow`](/api/@rulvar/core/interfaces/AgentInvocationRow.md)[] | - | [packages/core/src/l0/telemetry-reduce.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L86) |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;`string`, \{ `costBasis`: [`CostBasis`](/api/@rulvar/core/type-aliases/CostBasis.md); `costUsd`: `number`; `usage`: [`Usage`](/api/@rulvar/core/type-aliases/Usage.md); \}\&gt; | Aggregated over COMPLETED phase pairs, keyed by role. The bucket's `costBasis` is 'per-call' only while EVERY folded pair carried the per-call basis; one aggregate-estimate pair degrades the bucket. | [packages/core/src/l0/telemetry-reduce.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L92) |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Sum of agent:end costUsd over settled spans. | [packages/core/src/l0/telemetry-reduce.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L94) |
