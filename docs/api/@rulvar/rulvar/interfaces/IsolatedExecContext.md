[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / IsolatedExecContext

# Interface: IsolatedExecContext

Defined in: `packages/core/dist/index.d.ts`

The per-call context handed to a ToolExecutorProvider. It carries the
tool span (so provider telemetry nests under the run tree), the
cancellation signal, and a stable idempotency key.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-idempotencykey"></a> `idempotencyKey` | `string` | Stable identity of THIS logical tool call: identical (runId, tool, args) always derive the same key, so a provider whose work has external side effects can fold an at-least-once retry into effectively-once. A rerun of the same call after a mid-flight crash reuses the key; a different call never collides. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal` | `AbortSignal` | Fires on cancellation, a budget ceiling, or UsageLimits expiry. | `packages/core/dist/index.d.ts` |
| <a id="property-spanid"></a> `spanId` | `string` | The tool span, minted under the agent span exactly like inprocess. | `packages/core/dist/index.d.ts` |

## Methods

### log()

```ts
log(
   level, 
   msg, 
   data?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Emits telemetry log events under the tool span; never journals.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`void`
