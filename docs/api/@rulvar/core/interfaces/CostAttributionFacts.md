[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CostAttributionFacts

# Interface: CostAttributionFacts

Defined in: [packages/core/src/l0/entries.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L200)

Cost-attribution facts a live run knows at settlement and a pure
journal fold cannot re-derive: the innermost phase name at the call
site, the agent profile, the primary invocation role, the budget
account the call debited, and whether the dispatch spent the
orchestrator finalize reserve. Policy, never identity, exactly like
usageByModel: none of it enters the content key, and entries written
before the field shipped fold under the documented fallback buckets
(empty phase, 'unknown' agent type, role 'loop').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | - | [packages/core/src/l0/entries.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L202) |
| <a id="property-budgetaccount"></a> `budgetAccount?` | `string` | - | [packages/core/src/l0/entries.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L204) |
| <a id="property-finalizereserve"></a> `finalizeReserve?` | `boolean` | - | [packages/core/src/l0/entries.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L214) |
| <a id="property-label"></a> `label?` | `string` | The dispatch label, when the caller gave one (RV2803): what tells two spans of ONE role apart, which the event stream has always carried and the journal never did. Absent on every unlabelled dispatch and on every journal written before it shipped, so a reading that needs it reports absence rather than guessing. Policy, never identity. | [packages/core/src/l0/entries.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L213) |
| <a id="property-phase"></a> `phase?` | `string` | - | [packages/core/src/l0/entries.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L201) |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | - | [packages/core/src/l0/entries.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L203) |
