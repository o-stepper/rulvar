[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / JournaledChildRoster

# Interface: JournaledChildRoster

Defined in: `packages/core/dist/index.d.ts`

One orchestration's children, folded from its journal (RV2702).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-admitted"></a> `admitted` | `number` | Spawn admissions the controller ADMITTED. | `packages/core/dist/index.d.ts` |
| <a id="property-children"></a> `children` | [`JournaledChild`](/api/@rulvar/rulvar/interfaces/JournaledChild.md)[] | Every admitted child the journal holds a dispatch for, in dispatch order. | `packages/core/dist/index.d.ts` |
| <a id="property-childscope"></a> `childScope` | `string` | The scope the children dispatched under, which identifies the orchestration. | `packages/core/dist/index.d.ts` |
| <a id="property-rejected"></a> `rejected` | `number` | Spawn admissions it refused: no child ever ran, and none is listed below. | `packages/core/dist/index.d.ts` |
