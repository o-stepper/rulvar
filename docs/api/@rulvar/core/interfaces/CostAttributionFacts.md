[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttributionFacts

# Interface: CostAttributionFacts

Defined in: [packages/core/src/l0/entries.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L170)

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
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/l0/entries.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L172) |
| <a id="property-budgetaccount"></a> `budgetAccount?` | `string` | [packages/core/src/l0/entries.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L174) |
| <a id="property-finalizereserve"></a> `finalizeReserve?` | `boolean` | [packages/core/src/l0/entries.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L175) |
| <a id="property-phase"></a> `phase?` | `string` | [packages/core/src/l0/entries.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L171) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | [packages/core/src/l0/entries.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L173) |
