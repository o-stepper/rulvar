[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/anthropic](/api/@rulvar/anthropic/index.md) / AnthropicSdkOptions

# Type Alias: AnthropicSdkOptions

```ts
type AnthropicSdkOptions = Omit<AnthropicClientOptions, "maxRetries">;
```

Defined in: [packages/anthropic/src/adapter.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/anthropic/src/adapter.ts#L55)

Official SDK construction options forwarded verbatim to
`new Anthropic(...)`, minus `maxRetries`: Rulvar owns retries and
wall-clock, so SDK autoretries stay disabled no matter what is passed
here. This is the production surface for every credential mode the
SDK supports beyond a plain API key: bearer `authToken`, an
`AccessTokenProvider` via `credentials`, an `AnthropicConfig` via
`config` (OIDC/workload-identity federation included), a named
`profile`, plus `fetch`, `timeout`, and `defaultHeaders`.
