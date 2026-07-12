[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Workflow

# Interface: Workflow\&lt;A, R\&gt;

Defined in: [packages/core/src/engine/ctx.ts:462](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L462)

Closure-form workflow value; in-process only.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `A` | `unknown` |
| `R` | `unknown` |

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argsschema"></a> `argsSchema?` | `readonly` | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&lt;`A`\&gt; | [packages/core/src/engine/ctx.ts:465](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L465) |
| <a id="property-body"></a> `body` | `readonly` | (`ctx`, `args`) => `Promise`\&lt;`R`\&gt; | [packages/core/src/engine/ctx.ts:467](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L467) |
| <a id="property-errorpolicy"></a> `errorPolicy` | `readonly` | [`ErrorPolicy`](/api/@rulvar/core/type-aliases/ErrorPolicy.md) | [packages/core/src/engine/ctx.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L466) |
| <a id="property-kind"></a> `kind` | `readonly` | `"workflow"` | [packages/core/src/engine/ctx.ts:463](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L463) |
| <a id="property-name"></a> `name` | `readonly` | `string` | [packages/core/src/engine/ctx.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L464) |
