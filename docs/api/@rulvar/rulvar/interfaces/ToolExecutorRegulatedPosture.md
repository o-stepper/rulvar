[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolExecutorRegulatedPosture

# Interface: ToolExecutorRegulatedPosture

Defined in: `packages/core/dist/index.d.ts`

The posture an isolated tool executor chose at construction
(RV4204). The executor is the one construction that dispatches
HOST-SIDE effects, and the regulated floor requires its ledger: an
effect no ledger records is an effect nobody can reconcile, the
billingReceipts doctrine applied to tools.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-allowenv"></a> `allowEnv` | readonly `string`[] | Host env names reaching the child, the exact allowlist. | `packages/core/dist/index.d.ts` |
| <a id="property-bounds"></a> `bounds` | \{ `maxOutputBytes`: `number`; `timeoutMs`: `number`; \} | The resolved per-call ceilings (defaults resolve at construction). | `packages/core/dist/index.d.ts` |
| `bounds.maxOutputBytes` | `number` | - | `packages/core/dist/index.d.ts` |
| `bounds.timeoutMs` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation` | \| \{ `flavor`: `"subprocess"`; `sandboxed`: `boolean`; \} \| \{ `flavor`: `"container"`; `network`: `string`; `readOnlyRoot`: `boolean`; \} | The isolation seam, per flavor: a subprocess names whether a sandbox launcher wraps the command; a container names its network mode and root-filesystem posture. | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"tool-executor"` | - | `packages/core/dist/index.d.ts` |
| <a id="property-ledger"></a> `ledger` | `boolean` | Whether a ToolEffectLedger records every dispatch (intent first). | `packages/core/dist/index.d.ts` |
| <a id="property-name"></a> `name` | `string` | The reference flavor ('subprocess', 'container') or a host name. | `packages/core/dist/index.d.ts` |
| <a id="property-regulatedposture"></a> `regulatedPosture` | `1` | Descriptor shape version; bumps when the meaning changes. | `packages/core/dist/index.d.ts` |
