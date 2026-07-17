[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / OpenAiSdkOptions

# Type Alias: OpenAiSdkOptions

```ts
type OpenAiSdkOptions = Omit<OpenAiClientOptions, "maxRetries">;
```

Defined in: [packages/openai/src/adapter.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/adapter.ts#L51)

Official SDK construction options forwarded verbatim to
`new OpenAI(...)`, minus `maxRetries`: Rulvar owns retries and
wall-clock, so SDK autoretries stay disabled no matter what is passed
here. This is the production surface for auth beyond a plain API key,
`workloadIdentity` federation included, plus `fetch`, `timeout`, and
`defaultHeaders`. The SDK's own rules still apply inside it, e.g.
`sdkOptions.apiKey` and `sdkOptions.workloadIdentity` are mutually
exclusive and rejected typed at construction.
