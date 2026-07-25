[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / selfTestFinishValidation

# Function: selfTestFinishValidation()

```ts
function selfTestFinishValidation(options): FinishSelfTestReport;
```

Defined in: `packages/core/dist/index.d.ts`

Runs a configured validator set against golden fixtures BEFORE any
provider call exists (the v1.71 experiment review, P0.3): the accept
fixture must pass every validator (a stale validator rejecting a
correct skeleton is exactly the drift the experiment died of, three
renamed sections deep into a paid run), and the reject fixture must
fail at least one (a set that accepts the known-bad input validates
nothing). A validator that THROWS here is a host defect and the
ConfigError propagates, the same posture the live loop takes.
Deterministic and free: validators are pure synchronous host code by
contract, so this costs zero provider calls.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accept?`: [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md); `reject?`: [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md); `validators`: [`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[]; \} |
| `options.accept?` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) |
| `options.reject?` | [`FinishValidationInput`](/api/@rulvar/rulvar/interfaces/FinishValidationInput.md) |
| `options.validators` | [`FinishValidator`](/api/@rulvar/rulvar/interfaces/FinishValidator.md)[] |

## Returns

[`FinishSelfTestReport`](/api/@rulvar/rulvar/interfaces/FinishSelfTestReport.md)
