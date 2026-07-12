[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/planner](/api/@rulvar/planner/index.md) / PlanOptions

# Interface: PlanOptions

Defined in: [packages/planner/src/plan.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L33)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | The planner model; otherwise the chain resolves role 'plan'. | [packages/planner/src/plan.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L35) |
| <a id="property-profiles"></a> `profiles?` | `string`[] | Registered profile names to advertise; default: every profile. | [packages/planner/src/plan.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L37) |
| <a id="property-repairrounds"></a> `repairRounds?` | `number` | Self-repair rounds from JSON diagnostics; default 3 (Appendix A). | [packages/planner/src/plan.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/planner/src/plan.ts#L39) |
