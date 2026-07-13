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

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-argsschema"></a> `argsSchema?` | `readonly` | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-body"></a> `body` | `readonly` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-effort"></a> `effort?` | `readonly` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/rulvar/type-aliases/ErrorPolicy.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `readonly` | `"workflow"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | `readonly` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Workflow defaults: the third layer of the resolution chain, under the call override and the agent profile and over the engine defaults. A workflow that declares nothing contributes no layer and resolves exactly as it did before. The layer follows the CALL TREE, not the file: a child spawned through `ctx.workflow` contributes ITS OWN defaults inside its scope, so nesting a cheap workflow under an expensive one does the obvious thing. | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-routing"></a> `routing?` | `readonly` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/rulvar/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md)\&gt;\&gt; | - | `packages/core/dist/index.d.ts` |
