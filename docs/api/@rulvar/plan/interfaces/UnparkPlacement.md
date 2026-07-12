[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / UnparkPlacement

# Interface: UnparkPlacement

Defined in: [packages/plan/src/park.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L79)

The unpark placement (docs/03, 11.2): continuation or restart.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bootcheckpointref"></a> `bootCheckpointRef?` | `string` | The retained checkpoint the continuation boots from. | [packages/plan/src/park.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L83) |
| <a id="property-restart"></a> `restart` | `boolean` | True when the agent must restart (no checkpoint, or tree dropped). | [packages/plan/src/park.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L81) |
