[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolContext

# Interface: ToolContext

Defined in: [packages/core/src/l0/spi/toolsource.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L28)

The context handed to execute (and to permission hooks and canUseTool).
Deliberately exposes NO spawn primitives: tools are leaves of the
call-and-return tree (invariant I3); all spawning flows through Ctx
primitives (docs/08, section "ToolContext").

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agent"></a> `agent` | \{ `agentType`: `string`; `label?`: `string`; \} | - | [packages/core/src/l0/spi/toolsource.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L32) |
| `agent.agentType` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L32) |
| `agent.label?` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L32) |
| <a id="property-cwd"></a> `cwd` | `string` | Isolation working directory; host cwd under isolation 'none'. | [packages/core/src/l0/spi/toolsource.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L34) |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | The spawn's declared isolation. | [packages/core/src/l0/spi/toolsource.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L36) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/l0/spi/toolsource.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L29) |
| <a id="property-signal"></a> `signal` | `AbortSignal` | Fires on cancellation, budget ceiling, UsageLimits expiry. | [packages/core/src/l0/spi/toolsource.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L38) |
| <a id="property-spanid"></a> `spanId` | `string` | Tool span in the run > phase > agent > tool hierarchy (docs/09). | [packages/core/src/l0/spi/toolsource.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L31) |

## Methods

### log()

```ts
log(
   level, 
   msg, 
   data?): void;
```

Defined in: [packages/core/src/l0/spi/toolsource.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/toolsource.ts#L40)

Emits telemetry log events; never writes journal entries.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`void`
