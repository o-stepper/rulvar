[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournaledChildRoster

# Interface: JournaledChildRoster

Defined in: [packages/core/src/stores/reconcile.ts:688](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L688)

One orchestration's children, folded from its journal (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `number` | Spawn admissions the controller ADMITTED. | [packages/core/src/stores/reconcile.ts:692](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L692) |
| <a id="property-children"></a> `children` | [`JournaledChild`](/api/@rulvar/core/interfaces/JournaledChild.md)[] | Every admitted child the journal holds a dispatch for, in dispatch order. | [packages/core/src/stores/reconcile.ts:696](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L696) |
| <a id="property-childscope"></a> `childScope` | `string` | The scope the children dispatched under, which identifies the orchestration. | [packages/core/src/stores/reconcile.ts:690](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L690) |
| <a id="property-rejected"></a> `rejected` | `number` | Spawn admissions it refused: no child ever ran, and none is listed below. | [packages/core/src/stores/reconcile.ts:694](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L694) |
