[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolContextSeed

# Interface: ToolContextSeed

Defined in: [packages/core/src/tools/context.ts:13](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L13)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | [packages/core/src/tools/context.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L15) |
| <a id="property-cwd"></a> `cwd` | `string` | Isolation working directory; the host cwd under isolation 'none'. | [packages/core/src/tools/context.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L18) |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/core/type-aliases/IsolationSpec.md) | - | [packages/core/src/tools/context.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L19) |
| <a id="property-label"></a> `label?` | `string` | - | [packages/core/src/tools/context.ts:16](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L16) |
| <a id="property-runid"></a> `runId` | `string` | - | [packages/core/src/tools/context.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L14) |
| <a id="property-signal"></a> `signal` | `AbortSignal` | Fires on cancellation, budget ceiling, UsageLimits expiry. | [packages/core/src/tools/context.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L21) |

## Methods

### emitLog()

```ts
emitLog(
   spanId, 
   level, 
   msg, 
   data?): void;
```

Defined in: [packages/core/src/tools/context.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L24)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`void`

***

### mintSpan()

```ts
mintSpan(): string;
```

Defined in: [packages/core/src/tools/context.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/context.ts#L23)

Mints the tool span under the agent span.

#### Returns

`string`
