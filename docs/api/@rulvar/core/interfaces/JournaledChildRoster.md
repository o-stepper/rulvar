[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledChildRoster

# Interface: JournaledChildRoster

Defined in: [packages/core/src/stores/reconcile.ts:597](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L597)

One orchestration's children, folded from its journal (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `number` | Spawn admissions the controller ADMITTED. | [packages/core/src/stores/reconcile.ts:601](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L601) |
| <a id="property-children"></a> `children` | [`JournaledChild`](/api/@rulvar/core/interfaces/JournaledChild.md)[] | Every admitted child the journal holds a dispatch for, in dispatch order. | [packages/core/src/stores/reconcile.ts:605](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L605) |
| <a id="property-childscope"></a> `childScope` | `string` | The scope the children dispatched under, which identifies the orchestration. | [packages/core/src/stores/reconcile.ts:599](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L599) |
| <a id="property-rejected"></a> `rejected` | `number` | Spawn admissions it refused: no child ever ran, and none is listed below. | [packages/core/src/stores/reconcile.ts:603](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L603) |
