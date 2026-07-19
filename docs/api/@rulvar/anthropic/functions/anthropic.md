[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / anthropic

# Function: anthropic()

```ts
function anthropic(options?): ProviderAdapter;
```

Defined in: [packages/anthropic/src/adapter.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L163)

Creates the first-class Anthropic adapter (id 'anthropic'). SDK
autoretries are disabled (max_retries 0): the core owns retries and
wall-clock. With no auth option at all, the underlying SDK resolves
credentials itself: it reads `ANTHROPIC_API_KEY` and
`ANTHROPIC_AUTH_TOKEN` as INDEPENDENT credentials, never a
precedence chain between the two; requests carry `x-api-key` for the
key, bearer `Authorization` for the token, and BOTH headers when
both are set (the server decides). The SDK's config-file credential
chain (`credentials`, else `config`, else `profile`) is consulted
ONLY when apiKey and authToken are both null; either one set, an
env-read one included, means a configured token provider is never
even built. When `sdkOptions` carries structured auth and no
`apiKey`/`authToken` is set to a string anywhere, ambient
environment credentials are suppressed (explicit
`apiKey: null, authToken: null` are passed to the SDK), so the
configured provider is the one that authenticates; the SDK itself
would otherwise let an environment `ANTHROPIC_API_KEY` or
`ANTHROPIC_AUTH_TOKEN` win over the provider. An explicit
`apiKey: null` or `authToken: null` counts as absence for this rule,
never as a chosen credential. The full matrix lives in the providers
guide under anthropic-credential-precedence.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`AnthropicAdapterOptions`](/api/@rulvar/anthropic/interfaces/AnthropicAdapterOptions.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)
