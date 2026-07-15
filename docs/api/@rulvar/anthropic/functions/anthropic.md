[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / anthropic

# Function: anthropic()

```ts
function anthropic(options?): ProviderAdapter;
```

Defined in: [packages/anthropic/src/adapter.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L56)

Creates the first-class Anthropic adapter (id 'anthropic'). SDK
autoretries are disabled (max_retries 0): the core owns retries and
wall-clock.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AnthropicAdapterOptions`](/api/@rulvar/anthropic/interfaces/AnthropicAdapterOptions.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)
