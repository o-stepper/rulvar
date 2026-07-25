[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointScenario

# Interface: KillPointScenario

Defined in: [packages/store-conformance/src/kill-points.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L100)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-expected"></a> `expected` | [`KillPointExpectation`](/api/@rulvar/store-conformance/interfaces/KillPointExpectation.md) | - | [packages/store-conformance/src/kill-points.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L108) |
| <a id="property-id"></a> `id` | `string` | Stable scenario id (`<workflow>-<point>-<phase>`). | [packages/store-conformance/src/kill-points.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L102) |
| <a id="property-occurrence"></a> `occurrence` | `number` | Which matching write dies (1-based; step two of the happy run is 2). | [packages/store-conformance/src/kill-points.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L107) |
| <a id="property-phase"></a> `phase` | [`KillPointPhase`](/api/@rulvar/store-conformance/type-aliases/KillPointPhase.md) | - | [packages/store-conformance/src/kill-points.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L105) |
| <a id="property-point"></a> `point` | [`KillPointName`](/api/@rulvar/store-conformance/type-aliases/KillPointName.md) | - | [packages/store-conformance/src/kill-points.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L104) |
| <a id="property-workflow"></a> `workflow` | [`KillPointWorkflowKind`](/api/@rulvar/store-conformance/type-aliases/KillPointWorkflowKind.md) | - | [packages/store-conformance/src/kill-points.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L103) |
