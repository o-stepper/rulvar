[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolDef

# Interface: ToolDef\&lt;S\&gt;

Defined in: [packages/core/src/l0/spi/toolsource.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L59)

A defined tool. The identity projection is the ToolContract
{ name, description, parameters, version }: exactly what the model sees
and exactly what toolsetHash hashes; execute and every other
non-contract field are excluded by construction.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `S` *extends* [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) | [`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md) |

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-description"></a> `description` | `readonly` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L62) |
| <a id="property-execute"></a> `execute` | `public` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | [packages/core/src/l0/spi/toolsource.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L79) |
| <a id="property-executor"></a> `executor` | `readonly` | [`ToolExecutor`](/api/@rulvar/core/type-aliases/ToolExecutor.md) | Default 'inprocess'. | [packages/core/src/l0/spi/toolsource.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L67) |
| <a id="property-executorspec"></a> `executorSpec?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Opaque policy data for a non-inprocess executor: what THIS tool's declared executor should run (for a subprocess adapter, the command and its argv). Never identity: excluded from toolsetHash exactly like `executor` and `risk`, and ignored for 'inprocess'. The engine passes it verbatim to the ToolExecutorProvider (RV-216). | [packages/core/src/l0/spi/toolsource.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L75) |
| <a id="property-kind"></a> `kind` | `readonly` | `"tool"` | - | [packages/core/src/l0/spi/toolsource.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L60) |
| <a id="property-name"></a> `name` | `readonly` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L61) |
| <a id="property-needsapproval"></a> `needsApproval` | `readonly` | `boolean` | Default false; the terminal permission default asks when true. | [packages/core/src/l0/spi/toolsource.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L77) |
| <a id="property-parameters"></a> `parameters` | `readonly` | `S` | - | [packages/core/src/l0/spi/toolsource.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L63) |
| <a id="property-risk"></a> `risk?` | `readonly` | [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md) | - | [packages/core/src/l0/spi/toolsource.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L78) |
| <a id="property-version"></a> `version?` | `readonly` | `string` | Opaque contract version; part of toolsetHash. | [packages/core/src/l0/spi/toolsource.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L65) |
