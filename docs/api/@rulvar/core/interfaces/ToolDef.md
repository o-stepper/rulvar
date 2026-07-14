[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolDef

# Interface: ToolDef\&lt;S\&gt;

Defined in: [packages/core/src/l0/spi/toolsource.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L55)

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
| <a id="property-description"></a> `description` | `readonly` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L58) |
| <a id="property-execute"></a> `execute` | `public` | (`input`, `ctx`) => `Promise`\&lt;`unknown`\&gt; | - | [packages/core/src/l0/spi/toolsource.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L67) |
| <a id="property-executor"></a> `executor` | `readonly` | [`ToolExecutor`](/api/@rulvar/core/type-aliases/ToolExecutor.md) | Default 'inprocess'. | [packages/core/src/l0/spi/toolsource.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L63) |
| <a id="property-kind"></a> `kind` | `readonly` | `"tool"` | - | [packages/core/src/l0/spi/toolsource.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L56) |
| <a id="property-name"></a> `name` | `readonly` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L57) |
| <a id="property-needsapproval"></a> `needsApproval` | `readonly` | `boolean` | Default false; the terminal permission default asks when true. | [packages/core/src/l0/spi/toolsource.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L65) |
| <a id="property-parameters"></a> `parameters` | `readonly` | `S` | - | [packages/core/src/l0/spi/toolsource.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L59) |
| <a id="property-risk"></a> `risk?` | `readonly` | [`ToolRisk`](/api/@rulvar/core/type-aliases/ToolRisk.md) | - | [packages/core/src/l0/spi/toolsource.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L66) |
| <a id="property-version"></a> `version?` | `readonly` | `string` | Opaque contract version; part of toolsetHash. | [packages/core/src/l0/spi/toolsource.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L61) |
