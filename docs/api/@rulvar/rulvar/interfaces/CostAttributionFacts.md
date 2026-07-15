[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / CostAttributionFacts

# Interface: CostAttributionFacts

Defined in: `packages/core/dist/index.d.ts`

Cost-attribution facts a live run knows at settlement and a pure
journal fold cannot re-derive: the innermost phase name at the call
site, the agent profile, the primary invocation role, the budget
account the call debited, and whether the dispatch spent the
orchestrator finalize reserve. Policy, never identity, exactly like
usageByModel: none of it enters the content key, and entries written
before the field shipped fold under the documented fallback buckets
(empty phase, 'unknown' agent type, role 'loop').

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-budgetaccount"></a> `budgetAccount?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-finalizereserve"></a> `finalizeReserve?` | `boolean` | `packages/core/dist/index.d.ts` |
| <a id="property-phase"></a> `phase?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md) | `packages/core/dist/index.d.ts` |
