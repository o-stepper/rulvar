[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Workflow

# Interface: Workflow\&lt;A, R\&gt;

Defined in: `packages/core/dist/index.d.ts`

Closure-form workflow value; in-process only.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | `unknown` |
| `R` | `unknown` |

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argsschema"></a> `argsSchema?` | `readonly` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-body"></a> `body` | `readonly` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; | `packages/core/dist/index.d.ts` |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `readonly` | `"workflow"` | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `readonly` | `string` | `packages/core/dist/index.d.ts` |
