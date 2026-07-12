[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / anthropic

# Function: anthropic()

```ts
function anthropic(options?): ProviderAdapter;
```

Defined in: [packages/anthropic/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../anthropic/dist/index.d.ts)

Creates the first-class Anthropic adapter (id 'anthropic'). SDK
autoretries are disabled (max_retries 0): the core owns retries and
wall-clock (docs/04, section "Retries belong to the core").

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`AnthropicAdapterOptions`](/api/@rulvar/rulvar/interfaces/AnthropicAdapterOptions.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)
