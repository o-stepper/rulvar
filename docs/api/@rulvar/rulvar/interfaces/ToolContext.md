[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolContext

# Interface: ToolContext

Defined in: `packages/core/dist/index.d.ts`

The context handed to execute (and to permission hooks and canUseTool).
Deliberately exposes NO spawn primitives: tools are leaves of the
call-and-return tree (invariant I3); all spawning flows through Ctx
primitives.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | \{ `agentType`: `string`; `label?`: `string`; \} | - | `packages/core/dist/index.d.ts` |
| `agent.agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| `agent.label?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-cwd"></a> `cwd` | `string` | Isolation working directory; host cwd under isolation 'none'. | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | The spawn's declared isolation. | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal` | `AbortSignal` | Fires on cancellation, budget ceiling, UsageLimits expiry. | `packages/core/dist/index.d.ts` |
| <a id="property-spanid"></a> `spanId` | `string` | Tool span in the run > phase > agent > tool hierarchy. | `packages/core/dist/index.d.ts` |

## Methods

### log()

```ts
log(
   level, 
   msg, 
   data?): void;
```

Defined in: `packages/core/dist/index.d.ts`

Emits telemetry log events; never writes journal entries.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`void`
