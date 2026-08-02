[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolBudgetSummary

# Interface: ToolBudgetSummary

Defined in: [packages/core/src/l0/events.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L189)

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
| <a id="property-cap"></a> `cap?` | `number` | The effective executed-call cap at the end: maxToolCalls plus every granted extension. Absent when only toolUnits bounds the loop. | [packages/core/src/l0/events.ts:196](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L196) |
| <a id="property-extensionsgranted"></a> `extensionsGranted?` | `number` | Extension grants used, restored grants included; present exactly when toolBudgetExtension is configured (RV301). | [packages/core/src/l0/events.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L205) |
| <a id="property-finalizationreserveused"></a> `finalizationReserveUsed?` | `boolean` | Present and true when the finalization reserve summary turn ran. | [packages/core/src/l0/events.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L212) |
| <a id="property-finalizationwindowentered"></a> `finalizationWindowEntered?` | `boolean` | Present and true when the finalization window activated at least once this invocation (RV302). | [packages/core/src/l0/events.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L217) |
| <a id="property-limiter"></a> `limiter?` | `"toolUnits"` \| `"maxToolCalls"` | The tool budget limiter that ended the loop, on that 'limit' only. | [packages/core/src/l0/events.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L219) |
| <a id="property-noticesfired"></a> `noticesFired?` | `number`[] | Notice thresholds (fractions of the cap) whose notices entered the conversation; present when at least one fired. | [packages/core/src/l0/events.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L210) |
| <a id="property-unitsmax"></a> `unitsMax?` | `number` | The weighted budget; present when toolUnits is configured. | [packages/core/src/l0/events.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L200) |
| <a id="property-unitsused"></a> `unitsUsed?` | `number` | Weighted units spent; present when toolUnits is configured. | [packages/core/src/l0/events.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L198) |
| <a id="property-used"></a> `used` | `number` | Executed tool calls (the loop's own counter). | [packages/core/src/l0/events.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L191) |
