[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / anthropic

# Function: anthropic()

```ts
function anthropic(options?): ProviderAdapter;
```

Defined in: `packages/anthropic/dist/index.d.ts`

Creates the first-class Anthropic adapter (id 'anthropic'). SDK
autoretries are disabled (max_retries 0): the core owns retries and
wall-clock. With no auth option at all, the underlying SDK resolves
credentials itself: `ANTHROPIC_API_KEY`, then bearer
`ANTHROPIC_AUTH_TOKEN`, then its config-file credential chain. When
`sdkOptions` carries structured auth (`credentials`, `config`, or
`profile`) and no `apiKey`/`authToken` is set anywhere, ambient
environment credentials are suppressed (explicit `apiKey: null,
authToken: null` are passed to the SDK), so the configured provider
is the one that authenticates; the SDK itself would otherwise let an
environment `ANTHROPIC_API_KEY` win over the provider.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`AnthropicAdapterOptions`](/api/@rulvar/rulvar/interfaces/AnthropicAdapterOptions.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)
