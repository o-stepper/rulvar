---
'@rulvar/anthropic': patch
---

The `anthropic()` TSDoc no longer describes the SDK's ambient credentials as a precedence chain (v1.22.0 review P3-2). `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are independent credentials: requests carry `x-api-key` for the key, bearer `Authorization` for the token, and BOTH headers when both are set; the config-file token-provider chain is consulted only when apiKey and authToken are both null. The providers guide already said exactly this; the source doc (and the generated API page built from it) had drifted.
