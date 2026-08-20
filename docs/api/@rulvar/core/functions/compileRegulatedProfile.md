[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compileRegulatedProfile

# Function: compileRegulatedProfile()

```ts
function compileRegulatedProfile(input): RegulatedProfile;
```

Defined in: [packages/core/src/engine/regulated-profile.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/regulated-profile.ts#L323)

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `input` | \{ `construction?`: `"require-recognized"`; `engine`: [`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md); `orchestrate?`: [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md); `run`: [`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md); \} | - |
| `input.construction?` | `"require-recognized"` | The construction floor's strictness (RV4204). The default keeps the RV4101 posture: constructions exposing no descriptor are COUNTED into the hash as `unrecognized`, so the hash names its own blind spot. 'require-recognized' turns the count into a typed refusal naming the blind constructions: satisfiable since the first-party adapters and the reference executors attest (RV4204), so a compile with zero foreign constructions can now demand zero blind spots. |
| `input.engine` | [`CreateEngineOptions`](/api/@rulvar/core/interfaces/CreateEngineOptions.md) | - |
| `input.orchestrate?` | [`OrchestrateOptions`](/api/@rulvar/core/interfaces/OrchestrateOptions.md) | - |
| `input.run` | [`RunOptions`](/api/@rulvar/core/interfaces/RunOptions.md) | - |

## Returns

[`RegulatedProfile`](/api/@rulvar/core/interfaces/RegulatedProfile.md)
