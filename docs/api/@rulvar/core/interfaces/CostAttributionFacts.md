[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttributionFacts

# Interface: CostAttributionFacts

Defined in: [packages/core/src/l0/entries.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L105)

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
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/l0/entries.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L107) |
| <a id="property-budgetaccount"></a> `budgetAccount?` | `string` | [packages/core/src/l0/entries.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L109) |
| <a id="property-finalizereserve"></a> `finalizeReserve?` | `boolean` | [packages/core/src/l0/entries.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L110) |
| <a id="property-phase"></a> `phase?` | `string` | [packages/core/src/l0/entries.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L106) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | [packages/core/src/l0/entries.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L108) |
