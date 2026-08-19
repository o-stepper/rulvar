[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolSource

# Interface: ToolSource

Defined in: `packages/core/dist/index.d.ts`

The ToolSource seam: tools() yields the source's current ToolDefs. The
toolset snapshot for a given agent spawn is captured at spawn time and
hashed into the spawn's identity via toolsetHash; a mid-run change MUST
NOT mutate an in-flight agent's toolset.

## Extended by

- [`McpToolSource`](/api/@rulvar/rulvar/interfaces/McpToolSource.md)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | `packages/core/dist/index.d.ts` |

## Methods

### describeRegulatedPosture()?

```ts
optional describeRegulatedPosture(): RegulatedPostureDescriptor;
```

Defined in: `packages/core/dist/index.d.ts`

The construction-side posture attestation (RV4101): a PURE
snapshot of the risk postures this source chose at construction
(no wire, no connect, no side effects), read by
`compileRegulatedProfile` to refuse a loosened posture and hash a
tightened one. Optional: a source without it counts into the
profile's `unrecognized` tally instead of being implied verified.

#### Returns

[`RegulatedPostureDescriptor`](/api/@rulvar/rulvar/type-aliases/RegulatedPostureDescriptor.md)

***

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
