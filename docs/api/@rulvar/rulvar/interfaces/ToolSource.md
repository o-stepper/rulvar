[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolSource

# Interface: ToolSource

Defined in: `packages/core/dist/index.d.ts`

The ToolSource seam: tools() yields the source's current ToolDefs. The
toolset snapshot for a given agent spawn is captured at spawn time and
hashed into the spawn's identity via toolsetHash; a mid-run change MUST
NOT mutate an in-flight agent's toolset.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | `packages/core/dist/index.d.ts` |

## Methods

### tools()

```ts
tools(session): Promise<ToolDef<SchemaSpec<unknown>>[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`ToolSourceSession`](/api/@rulvar/rulvar/interfaces/ToolSourceSession.md) |

#### Returns

`Promise`\&lt;[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;[]\&gt;
