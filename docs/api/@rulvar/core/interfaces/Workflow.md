[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Workflow

# Interface: Workflow\&lt;A, R\&gt;

Defined in: [packages/core/src/engine/ctx.ts:496](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L496)

Closure-form workflow value; in-process only.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | `unknown` |
| `R` | `unknown` |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-argsschema"></a> `argsSchema?` | `readonly` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; | - | [packages/core/src/engine/ctx.ts:499](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L499) |
| <a id="property-body"></a> `body` | `readonly` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; | - | [packages/core/src/engine/ctx.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L513) |
| <a id="property-effort"></a> `effort?` | `readonly` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/engine/ctx.ts:512](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L512) |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | - | [packages/core/src/engine/ctx.ts:500](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L500) |
| <a id="property-kind"></a> `kind` | `readonly` | `"workflow"` | - | [packages/core/src/engine/ctx.ts:497](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L497) |
| <a id="property-model"></a> `model?` | `readonly` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Workflow defaults: the third layer of the resolution chain, under the call override and the agent profile and over the engine defaults. A workflow that declares nothing contributes no layer and resolves exactly as it did before. The layer follows the CALL TREE, not the file: a child spawned through `ctx.workflow` contributes ITS OWN defaults inside its scope, so nesting a cheap workflow under an expensive one does the obvious thing. | [packages/core/src/engine/ctx.ts:510](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L510) |
| <a id="property-name"></a> `name` | `readonly` | `string` | - | [packages/core/src/engine/ctx.ts:498](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L498) |
| <a id="property-routing"></a> `routing?` | `readonly` | `Partial`\&lt;`Record`\&lt;[`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md), [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md)\&gt;\&gt; | - | [packages/core/src/engine/ctx.ts:511](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L511) |
