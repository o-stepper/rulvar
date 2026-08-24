[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / RulvarError

# Abstract Class: RulvarError

Defined in: [packages/core/src/l0/errors.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L61)

Base class for all engine-raised errors. "Retryable" means the engine's
own retry machinery (RetryPolicy under the journal) MAY retry;
it never means a provider SDK autoretry, which is disabled.

## Extends

- `Error`

## Extended by

- [`ConfigError`](/api/@rulvar/core/classes/ConfigError.md)
- [`NonSerializableValueError`](/api/@rulvar/core/classes/NonSerializableValueError.md)
- [`ScriptRejected`](/api/@rulvar/core/classes/ScriptRejected.md)
- [`JournalCompatibilityError`](/api/@rulvar/core/classes/JournalCompatibilityError.md)
- [`InvalidResolutionError`](/api/@rulvar/core/classes/InvalidResolutionError.md)
- [`JournalOrderViolation`](/api/@rulvar/core/classes/JournalOrderViolation.md)
- [`PlanInvariantError`](/api/@rulvar/core/classes/PlanInvariantError.md)
- [`ReplayPlanHashMismatch`](/api/@rulvar/core/classes/ReplayPlanHashMismatch.md)
- [`OrchestratorCapConfigError`](/api/@rulvar/core/classes/OrchestratorCapConfigError.md)
- [`JournalMissError`](/api/@rulvar/core/classes/JournalMissError.md)
- [`BudgetExhaustedError`](/api/@rulvar/core/classes/BudgetExhaustedError.md)
- [`JournalSealedError`](/api/@rulvar/core/classes/JournalSealedError.md)
- [`JournalIntegrityError`](/api/@rulvar/core/classes/JournalIntegrityError.md)
- [`FailRunError`](/api/@rulvar/core/classes/FailRunError.md)
- [`AdmissionRejectedError`](/api/@rulvar/core/classes/AdmissionRejectedError.md)
- [`SandboxError`](/api/@rulvar/core/classes/SandboxError.md)
- [`LeaseHeldError`](/api/@rulvar/core/classes/LeaseHeldError.md)
- [`EffectLaneRefusedError`](/api/@rulvar/core/classes/EffectLaneRefusedError.md)
- [`SettlementError`](/api/@rulvar/core/classes/SettlementError.md)
- [`SupersededError`](/api/@rulvar/core/classes/SupersededError.md)
- [`KnowledgeCasError`](/api/@rulvar/core/classes/KnowledgeCasError.md)
- [`DeterminismError`](/api/@rulvar/core/classes/DeterminismError.md)

## Constructors

### Constructor

```ts
new RulvarError(message, opts?): RulvarError;
```

Defined in: [packages/core/src/l0/errors.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L66)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); `retryable?`: `boolean`; \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |
| `opts.retryable?` | `boolean` |

#### Returns

`RulvarError`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `abstract` | [`ErrorCode`](/api/@rulvar/core/type-aliases/ErrorCode.md) | [packages/core/src/l0/errors.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L62) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/l0/errors.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L64) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | [packages/core/src/l0/errors.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L63) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L75)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)
