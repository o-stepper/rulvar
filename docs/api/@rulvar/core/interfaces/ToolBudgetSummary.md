[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolBudgetSummary

# Interface: ToolBudgetSummary

Defined in: [packages/core/src/l0/events.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L260)

The tool budget pressure snapshot (RV304, the seventh comparison
experiment): how close one agent invocation came to its tool budget,
visible BEFORE the terminal 'limit' a starved worker would settle
with. Attached to the full AgentResult and to the live `agent:end`
event whenever maxToolCalls, toolUnits, or toolBudgetExtension is
configured. The durable subset: since RV3002 the terminal entry
journals `used` and the effective `cap` at settle, so a replayed
result restores them unconditionally on new journals; an extension
grant and the finalization-window entry journal as decision entries
the moment they fire (RV509) and merge into the restored summary as
`extensionsGranted` and `finalizationWindowEntered`. A journal
written before the entry field shipped keeps the RV509 behavior byte
for byte: `used` from the terminal checkpoint plus the
decision-backed fields, present exactly when the invocation
journaled at least one decision. Every other field
(unitsUsed/unitsMax, noticesFired, finalizationReserveUsed, limiter)
is live-only fidelity, exactly like transportRetries, and stays
absent on replay.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-cap"></a> `cap?` | `number` | The effective executed-call cap at the end: maxToolCalls plus every granted extension. Absent when only toolUnits bounds the loop. | [packages/core/src/l0/events.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L267) |
| <a id="property-extensionsgranted"></a> `extensionsGranted?` | `number` | Extension grants used, restored grants included; present exactly when toolBudgetExtension is configured (RV301). | [packages/core/src/l0/events.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L276) |
| <a id="property-finalizationreserveused"></a> `finalizationReserveUsed?` | `boolean` | Present and true when the finalization reserve summary turn ran. | [packages/core/src/l0/events.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L283) |
| <a id="property-finalizationwindowentered"></a> `finalizationWindowEntered?` | `boolean` | Present and true when the finalization window activated at least once this invocation (RV302). | [packages/core/src/l0/events.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L288) |
| <a id="property-limiter"></a> `limiter?` | `"toolUnits"` \| `"maxToolCalls"` | The tool budget limiter that ended the loop, on that 'limit' only. | [packages/core/src/l0/events.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L290) |
| <a id="property-noticesfired"></a> `noticesFired?` | `number`[] | Notice thresholds (fractions of the cap) whose notices entered the conversation; present when at least one fired. | [packages/core/src/l0/events.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L281) |
| <a id="property-unitsmax"></a> `unitsMax?` | `number` | The weighted budget; present when toolUnits is configured. | [packages/core/src/l0/events.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L271) |
| <a id="property-unitsused"></a> `unitsUsed?` | `number` | Weighted units spent; present when toolUnits is configured. | [packages/core/src/l0/events.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L269) |
| <a id="property-used"></a> `used` | `number` | Executed tool calls (the loop's own counter). | [packages/core/src/l0/events.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L262) |
