[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttributionFacts

# Interface: CostAttributionFacts

Defined in: [packages/core/src/l0/entries.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L181)

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
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/l0/entries.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L183) |
| <a id="property-budgetaccount"></a> `budgetAccount?` | `string` | [packages/core/src/l0/entries.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L185) |
| <a id="property-finalizereserve"></a> `finalizeReserve?` | `boolean` | [packages/core/src/l0/entries.ts:186](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L186) |
| <a id="property-phase"></a> `phase?` | `string` | [packages/core/src/l0/entries.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L182) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | [packages/core/src/l0/entries.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L184) |
