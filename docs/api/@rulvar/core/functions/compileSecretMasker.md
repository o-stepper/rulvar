[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compileSecretMasker

# Function: compileSecretMasker()

```ts
function compileSecretMasker(patterns?, site?): SecretMasker;
```

Defined in: [packages/core/src/l0/serialization.ts:227](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/serialization.ts#L227)

Compiles the redaction policy: the DEFAULT credential pattern set
plus host-defined patterns (RV-217), for the telemetry boundary
(events and traces; never the journal, where lossless encryption is
the right tool). String patterns compile as global regexes; RegExp
patterns are recompiled with the global flag when it is missing, so
replace-all semantics always hold. An invalid pattern is a typed
ConfigError at compile time, before anything runs under the policy.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `patterns` | readonly (`string` \| `RegExp`)[] | `[]` |
| `site` | `string` | `'redaction.patterns'` |

## Returns

[`SecretMasker`](/api/@rulvar/core/interfaces/SecretMasker.md)
