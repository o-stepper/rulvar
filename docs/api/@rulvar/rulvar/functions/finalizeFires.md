[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / finalizeFires

# Function: finalizeFires()

```ts
function finalizeFires(options): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

The finalize firing rule: only if configured in routing, and only after
tools stop, which presupposes a non-empty toolset. A no-tools agent's
single loop turn is already its synthesis (as amended in M4-T01). The
caller additionally gates on the loop having
ended without an abort: a limit/error/cancelled/escalated loop never
reaches synthesis.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `routed`: `boolean`; `toolsAvailable`: `boolean`; \} |
| `options.routed` | `boolean` |
| `options.toolsAvailable` | `boolean` |

## Returns

`boolean`
