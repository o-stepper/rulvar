[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolContextSeed

# Interface: ToolContextSeed

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-cwd"></a> `cwd` | `string` | Isolation working directory; the host cwd under isolation 'none'. | `packages/core/dist/index.d.ts` |
| <a id="property-isolation"></a> `isolation` | [`IsolationSpec`](/api/@rulvar/rulvar/type-aliases/IsolationSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-signal"></a> `signal` | `AbortSignal` | Fires on cancellation, budget ceiling, UsageLimits expiry. | `packages/core/dist/index.d.ts` |

## Methods

### emitLog()

```ts
emitLog(
   spanId, 
   level, 
   msg, 
   data?): void;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |
| `level` | `"error"` \| `"debug"` \| `"info"` \| `"warn"` |
| `msg` | `string` |
| `data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`void`

***

### mintSpan()

```ts
mintSpan(): string;
```

Defined in: `packages/core/dist/index.d.ts`

Mints the tool span under the agent span.

#### Returns

`string`
