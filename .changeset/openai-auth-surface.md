---
'@rulvar/openai': minor
---

Production auth surface (v1.14 review P2-2). New `sdkOptions` on `OpenAiAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`OpenAiSdkOptions`) and forced to 0: `workloadIdentity` federation included, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `OpenAI` instance directly under strict TypeScript, no casts, alongside the structural `OpenAiClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options, duplicated fields, and the `apiKey` plus `sdkOptions.workloadIdentity` conflict, all before any network I/O. A synthetic workload-identity test covers the full path: one token exchange, one Responses API request under the short-lived bearer, canonical finish.
