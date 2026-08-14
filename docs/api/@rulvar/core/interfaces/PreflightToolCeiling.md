[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PreflightToolCeiling

# Interface: PreflightToolCeiling

Defined in: [packages/core/src/engine/preflight.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L347)

Per-tool executed-call ceiling and the limiter that provides it.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-boundby"></a> `boundBy?` | `"maxCallsPerTool"` \| `"toolUnits"` \| `"maxToolCalls"` | The limiter producing the ceiling, when one binds. | [packages/core/src/engine/preflight.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L353) |
| <a id="property-ceiling"></a> `ceiling` | `number` \| `null` | Executed calls possible for this tool alone; null = unlimited. | [packages/core/src/engine/preflight.ts:351](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L351) |
| <a id="property-tool"></a> `tool` | `string` | A named tool, or '(any)' for a tool no cap or cost names. | [packages/core/src/engine/preflight.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/preflight.ts#L349) |
