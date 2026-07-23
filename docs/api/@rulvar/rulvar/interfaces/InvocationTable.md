[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / InvocationTable

# Interface: InvocationTable

Defined in: `packages/core/dist/index.d.ts`

The reduced table plus the per-role aggregate across every span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agents"></a> `agents` | [`AgentInvocationRow`](/api/@rulvar/rulvar/interfaces/AgentInvocationRow.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-byrole"></a> `byRole` | `Record`\&lt;`string`, \{ `costUsd`: `number`; `usage`: [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md); \}\&gt; | Aggregated over COMPLETED phase pairs, keyed by role. | `packages/core/dist/index.d.ts` |
| <a id="property-totalcostusd"></a> `totalCostUsd` | `number` | Sum of agent:end costUsd over settled spans. | `packages/core/dist/index.d.ts` |
