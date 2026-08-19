[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / McpSourceRegulatedPosture

# Interface: McpSourceRegulatedPosture

Defined in: `packages/core/dist/index.d.ts`

The posture an mcp() tool source chose at construction (RV1516/RV1808).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-bounds"></a> `bounds` | \{ `declared`: `boolean`; `discoveryMs?`: `number`; `maxPages?`: `number`; `maxSchemaBytes?`: `number`; `maxTools?`: `number`; \} | The discovery bounds (RV1808); `declared` is the all-four predicate `requireBounds` enforces (maxTools, maxPages, maxSchemaBytes, timeouts.discoveryMs), and the declared values ride beside it so the profile hash moves when a bound moves. | `packages/core/dist/index.d.ts` |
| `bounds.declared` | `boolean` | - | `packages/core/dist/index.d.ts` |
| `bounds.discoveryMs?` | `number` | - | `packages/core/dist/index.d.ts` |
| `bounds.maxPages?` | `number` | - | `packages/core/dist/index.d.ts` |
| `bounds.maxSchemaBytes?` | `number` | - | `packages/core/dist/index.d.ts` |
| `bounds.maxTools?` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-drift"></a> `drift` | `"refuse"` \| `"rekey"` | What a listChanged notification means for this source (RV1516). | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"mcp-source"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | The source id (`mcp:stdio:<command>`, `mcp:http:<url>`, `mcp:inprocess`). | `packages/core/dist/index.d.ts` |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | `packages/core/dist/index.d.ts` |
