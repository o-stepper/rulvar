---
'@rulvar/anthropic': minor
---

Production auth surface (v1.14 review P2-2). New `sdkOptions` on `AnthropicAdapterOptions` forwards official SDK construction options verbatim, `maxRetries` excluded from the type (`AnthropicSdkOptions`) and forced to 0: bearer `authToken`, an `AccessTokenProvider` via `credentials`, `config` (OIDC/workload-identity federation), `profile`, plus `fetch`, `timeout`, and `defaultHeaders`. The `client` option now accepts the official `Anthropic` instance directly under strict TypeScript, no casts, alongside the structural `AnthropicClientLike` mock; an injected client with SDK autoretries enabled (`maxRetries !== 0`) is rejected with a typed `ConfigError`, as are `client` combined with construction options and the same field set both top-level and in `sdkOptions`, all before any network I/O. The implicit SDK credential chain (`ANTHROPIC_API_KEY`, then bearer `ANTHROPIC_AUTH_TOKEN`, then config files) is now documented and covered by tests.
