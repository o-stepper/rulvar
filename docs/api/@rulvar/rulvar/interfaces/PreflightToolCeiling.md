[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PreflightToolCeiling

# Interface: PreflightToolCeiling

Defined in: `packages/core/dist/index.d.ts`

Per-tool executed-call ceiling and the limiter that provides it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-boundby"></a> `boundBy?` | `"maxToolCalls"` \| `"maxCallsPerTool"` \| `"toolUnits"` | The limiter producing the ceiling, when one binds. | `packages/core/dist/index.d.ts` |
| <a id="property-ceiling"></a> `ceiling` | `number` \| `null` | Executed calls possible for this tool alone; null = unlimited. | `packages/core/dist/index.d.ts` |
| <a id="property-tool"></a> `tool` | `string` | A named tool, or '(any)' for a tool no cap or cost names. | `packages/core/dist/index.d.ts` |
