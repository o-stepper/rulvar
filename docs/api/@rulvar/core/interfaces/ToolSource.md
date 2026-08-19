[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolSource

# Interface: ToolSource

Defined in: [packages/core/src/l0/spi/toolsource.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L96)

The ToolSource seam: tools() yields the source's current ToolDefs. The
toolset snapshot for a given agent spawn is captured at spawn time and
hashed into the spawn's identity via toolsetHash; a mid-run change MUST
NOT mutate an in-flight agent's toolset.

## Extended by

- [`McpToolSource`](/api/@rulvar/core/interfaces/McpToolSource.md)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | [packages/core/src/l0/spi/toolsource.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L97) |

## Methods

### describeRegulatedPosture()?

```ts
optional describeRegulatedPosture(): RegulatedPostureDescriptor;
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L107)

The construction-side posture attestation (RV4101): a PURE
snapshot of the risk postures this source chose at construction
(no wire, no connect, no side effects), read by
`compileRegulatedProfile` to refuse a loosened posture and hash a
tightened one. Optional: a source without it counts into the
profile's `unrecognized` tally instead of being implied verified.

#### Returns

[`RegulatedPostureDescriptor`](/api/@rulvar/core/type-aliases/RegulatedPostureDescriptor.md)

***

### tools()

```ts
tools(session): Promise<ToolDef<SchemaSpec>[]>;
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L98)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `session` | [`ToolSourceSession`](/api/@rulvar/core/interfaces/ToolSourceSession.md) |

#### Returns

`Promise`\&lt;[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;[]\&gt;
