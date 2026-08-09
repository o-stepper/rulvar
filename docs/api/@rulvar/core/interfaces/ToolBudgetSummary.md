[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolBudgetSummary

# Interface: ToolBudgetSummary

Defined in: [packages/core/src/l0/events.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L226)

The tool budget pressure snapshot (RV304, the seventh comparison
experiment): how close one agent invocation came to its tool budget,
visible BEFORE the terminal 'limit' a starved worker would settle
with. Attached to the full AgentResult and to the live `agent:end`
event whenever maxToolCalls, toolUnits, or toolBudgetExtension is
configured. The snapshot itself never journals, but since RV509 it
has a durable subset: an extension grant and the finalization-window
entry journal as decision entries the moment they fire, a
crash-resume restores them from the journal, and a replayed result
carries `used` (from the terminal checkpoint), the granted `cap`,
`extensionsGranted`, and `finalizationWindowEntered` whenever the
invocation journaled at least one such decision. Every other field
(unitsUsed/unitsMax, noticesFired, finalizationReserveUsed, limiter,
and the cap of a grant-free run) is live-only fidelity, exactly like
transportRetries, and stays absent on replay.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cap"></a> `cap?` | `number` | The effective executed-call cap at the end: maxToolCalls plus every granted extension. Absent when only toolUnits bounds the loop. | [packages/core/src/l0/events.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L233) |
| <a id="property-extensionsgranted"></a> `extensionsGranted?` | `number` | Extension grants used, restored grants included; present exactly when toolBudgetExtension is configured (RV301). | [packages/core/src/l0/events.ts:242](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L242) |
| <a id="property-finalizationreserveused"></a> `finalizationReserveUsed?` | `boolean` | Present and true when the finalization reserve summary turn ran. | [packages/core/src/l0/events.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L249) |
| <a id="property-finalizationwindowentered"></a> `finalizationWindowEntered?` | `boolean` | Present and true when the finalization window activated at least once this invocation (RV302). | [packages/core/src/l0/events.ts:254](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L254) |
| <a id="property-limiter"></a> `limiter?` | `"toolUnits"` \| `"maxToolCalls"` | The tool budget limiter that ended the loop, on that 'limit' only. | [packages/core/src/l0/events.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L256) |
| <a id="property-noticesfired"></a> `noticesFired?` | `number`[] | Notice thresholds (fractions of the cap) whose notices entered the conversation; present when at least one fired. | [packages/core/src/l0/events.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L247) |
| <a id="property-unitsmax"></a> `unitsMax?` | `number` | The weighted budget; present when toolUnits is configured. | [packages/core/src/l0/events.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L237) |
| <a id="property-unitsused"></a> `unitsUsed?` | `number` | Weighted units spent; present when toolUnits is configured. | [packages/core/src/l0/events.ts:235](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L235) |
| <a id="property-used"></a> `used` | `number` | Executed tool calls (the loop's own counter). | [packages/core/src/l0/events.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L228) |
