[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compileSecretMasker

# Function: compileSecretMasker()

```ts
function compileSecretMasker(patterns?, site?): SecretMasker;
```

Defined in: `packages/core/dist/index.d.ts`

Compiles the redaction policy: the DEFAULT credential pattern set
plus host-defined patterns (RV-217), for the telemetry boundary
(events and traces; never the journal, where lossless encryption is
the right tool). String patterns compile as global regexes; RegExp
patterns are recompiled with the global flag when it is missing, so
replace-all semantics always hold. An invalid pattern is a typed
ConfigError at compile time, before anything runs under the policy.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `patterns?` | readonly (`string` \| `RegExp`)[] |
| `site?` | `string` |

## Returns

[`SecretMasker`](/api/@rulvar/rulvar/interfaces/SecretMasker.md)
