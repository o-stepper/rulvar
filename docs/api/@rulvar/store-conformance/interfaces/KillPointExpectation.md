[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointExpectation

# Interface: KillPointExpectation

Defined in: [packages/store-conformance/src/kill-points.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L85)

The pinned recovery semantics a scenario asserts.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-childcalls"></a> `childCalls` | `number` | Provider calls the child paid before dying. | [packages/store-conformance/src/kill-points.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L87) |
| <a id="property-childtoolexecutions"></a> `childToolExecutions` | `number` | Tool executions the child performed before dying. | [packages/store-conformance/src/kill-points.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L89) |
| <a id="property-limitterminals"></a> `limitTerminals` | `number` | `agent` terminals with status `limit` in the final journal. | [packages/store-conformance/src/kill-points.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L95) |
| <a id="property-resumecalls"></a> `resumeCalls` | `number` | Provider calls the resume pays (the bracket's documented re-pay). | [packages/store-conformance/src/kill-points.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L91) |
| <a id="property-resumetoolexecutions"></a> `resumeToolExecutions` | `number` | Tool executions during the resume. | [packages/store-conformance/src/kill-points.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L93) |
| <a id="property-value"></a> `value` | `unknown` | The workflow value after recovery. | [packages/store-conformance/src/kill-points.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L97) |
