[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolBudgetSummary

# Interface: ToolBudgetSummary

Defined in: `packages/core/dist/index.d.ts`

The tool budget pressure snapshot (RV304, the seventh comparison
experiment): how close one agent invocation came to its tool budget,
visible BEFORE the terminal 'limit' a starved worker would settle
with. Attached to the full AgentResult and to the live `agent:end`
event whenever maxToolCalls, toolUnits, or toolBudgetExtension is
configured. Live telemetry only, exactly like transportRetries: never
journaled, absent on a replayed result.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cap"></a> `cap?` | `number` | The effective executed-call cap at the end: maxToolCalls plus every granted extension. Absent when only toolUnits bounds the loop. | `packages/core/dist/index.d.ts` |
| <a id="property-extensionsgranted"></a> `extensionsGranted?` | `number` | Extension grants used, restored grants included; present exactly when toolBudgetExtension is configured (RV301). | `packages/core/dist/index.d.ts` |
| <a id="property-finalizationreserveused"></a> `finalizationReserveUsed?` | `boolean` | Present and true when the finalization reserve summary turn ran. | `packages/core/dist/index.d.ts` |
| <a id="property-finalizationwindowentered"></a> `finalizationWindowEntered?` | `boolean` | Present and true when the finalization window activated at least once this invocation (RV302). | `packages/core/dist/index.d.ts` |
| <a id="property-limiter"></a> `limiter?` | `"maxToolCalls"` \| `"toolUnits"` | The tool budget limiter that ended the loop, on that 'limit' only. | `packages/core/dist/index.d.ts` |
| <a id="property-noticesfired"></a> `noticesFired?` | `number`[] | Notice thresholds (fractions of the cap) whose notices entered the conversation; present when at least one fired. | `packages/core/dist/index.d.ts` |
| <a id="property-unitsmax"></a> `unitsMax?` | `number` | The weighted budget; present when toolUnits is configured. | `packages/core/dist/index.d.ts` |
| <a id="property-unitsused"></a> `unitsUsed?` | `number` | Weighted units spent; present when toolUnits is configured. | `packages/core/dist/index.d.ts` |
| <a id="property-used"></a> `used` | `number` | Executed tool calls (the loop's own counter). | `packages/core/dist/index.d.ts` |
