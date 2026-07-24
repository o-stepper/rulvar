[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolDef

# Interface: ToolDef\&lt;S\&gt;

Defined in: `packages/core/dist/index.d.ts`

A defined tool. The identity projection is the ToolContract
{ name, description, parameters, version }: exactly what the model sees
and exactly what toolsetHash hashes; execute and every other
non-contract field are excluded by construction.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) | [`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md) |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-execute"></a> `execute` | `public` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | `packages/core/dist/index.d.ts` |
| <a id="property-executor"></a> `executor` | `readonly` | [`ToolExecutor`](/api/@rulvar/rulvar/type-aliases/ToolExecutor.md) | Default 'inprocess'. | `packages/core/dist/index.d.ts` |
| <a id="property-executorspec"></a> `executorSpec?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | Opaque policy data for a non-inprocess executor: what THIS tool's declared executor should run (for a subprocess adapter, the command and its argv). Never identity: excluded from toolsetHash exactly like `executor` and `risk`, and ignored for 'inprocess'. The engine passes it verbatim to the ToolExecutorProvider (RV-216). | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `readonly` | `"tool"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `readonly` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-needsapproval"></a> `needsApproval` | `readonly` | `boolean` | Default false; the terminal permission default asks when true. | `packages/core/dist/index.d.ts` |
| <a id="property-parameters"></a> `parameters` | `readonly` | `S` | - | `packages/core/dist/index.d.ts` |
| <a id="property-risk"></a> `risk?` | `readonly` | [`ToolRisk`](/api/@rulvar/rulvar/type-aliases/ToolRisk.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-version"></a> `version?` | `readonly` | `string` | Opaque contract version; part of toolsetHash. | `packages/core/dist/index.d.ts` |
