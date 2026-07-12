[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolSource

# Interface: ToolSource

Defined in: [packages/core/src/l0/spi/toolsource.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L84)

The ToolSource seam: tools() yields the source's current ToolDefs. The
toolset snapshot for a given agent spawn is captured at spawn time and
hashed into the spawn's identity via toolsetHash; a mid-run change MUST
NOT mutate an in-flight agent's toolset (docs/08, section "MCP bus").

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | [packages/core/src/l0/spi/toolsource.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L85) |

## Methods

### tools()

```ts
tools(session): Promise<ToolDef<SchemaSpec>[]>;
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L86)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`ToolSourceSession`](/api/@rulvar/core/interfaces/ToolSourceSession.md) |

#### Returns

`Promise`\&lt;[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]\&gt;
