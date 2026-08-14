[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentInvocationRow

# Interface: AgentInvocationRow

Defined in: `packages/core/dist/index.d.ts`

One logical agent span.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-costbasis"></a> `costBasis` | [`CostBasis`](/api/@rulvar/rulvar/type-aliases/CostBasis.md) | The fold behind `costUsd` (RV702), from the span's agent:end; an absent field (a pre-RV702 stream, or a span still open) reduces to 'aggregate-estimate', never to a per-call claim it cannot back. | `packages/core/dist/index.d.ts` |
| <a id="property-costusd"></a> `costUsd` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-hostrejected"></a> `hostRejected?` | `boolean` | Present and true when the invocation was aborted by the host's finish rejection (RV3702): the declared finish contract rejected the candidate past its repair bound, so the span died by host hand with its wires fine. From the agent:end stamp; absent everywhere else. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-open"></a> `open` | `boolean` | True when the span's agent:end never arrived. | `packages/core/dist/index.d.ts` |
| <a id="property-phases"></a> `phases` | [`PhaseRow`](/api/@rulvar/rulvar/interfaces/PhaseRow.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-replayed"></a> `replayed` | `boolean` | - | `packages/core/dist/index.d.ts` |
| <a id="property-retrycount"></a> `retryCount` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | `string` | The primary role from agent:start. | `packages/core/dist/index.d.ts` |
| <a id="property-spanid"></a> `spanId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status?` | `string` | From agent:end; absent while the span is open. | `packages/core/dist/index.d.ts` |
| <a id="property-toolbudget"></a> `toolBudget?` | [`ToolBudgetSummary`](/api/@rulvar/rulvar/interfaces/ToolBudgetSummary.md) | The tool budget pressure snapshot (RV304), carried through from the live agent:end. Absent on replayed rows and unbounded loops. | `packages/core/dist/index.d.ts` |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/rulvar/type-aliases/Usage.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-usageapprox"></a> `usageApprox` | `boolean` | - | `packages/core/dist/index.d.ts` |
