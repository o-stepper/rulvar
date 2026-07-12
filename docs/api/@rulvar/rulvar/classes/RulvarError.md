[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / RulvarError

# Abstract Class: RulvarError

Defined in: `packages/core/dist/index.d.ts`

Base class for all engine-raised errors. "Retryable" means the engine's
own retry machinery (RetryPolicy under the journal) MAY retry;
it never means a provider SDK autoretry, which is disabled.

## Extends

- `Error`

## Extended by

- [`AdmissionRejectedError`](/api/@rulvar/rulvar/classes/AdmissionRejectedError.md)
- [`BudgetExhaustedError`](/api/@rulvar/rulvar/classes/BudgetExhaustedError.md)
- [`ConfigError`](/api/@rulvar/rulvar/classes/ConfigError.md)
- [`InvalidResolutionError`](/api/@rulvar/rulvar/classes/InvalidResolutionError.md)
- [`JournalCompatibilityError`](/api/@rulvar/rulvar/classes/JournalCompatibilityError.md)
- [`JournalMissError`](/api/@rulvar/rulvar/classes/JournalMissError.md)
- [`JournalOrderViolation`](/api/@rulvar/rulvar/classes/JournalOrderViolation.md)
- [`KnowledgeCasError`](/api/@rulvar/rulvar/classes/KnowledgeCasError.md)
- [`LeaseHeldError`](/api/@rulvar/rulvar/classes/LeaseHeldError.md)
- [`NonSerializableValueError`](/api/@rulvar/rulvar/classes/NonSerializableValueError.md)
- [`OrchestratorCapConfigError`](/api/@rulvar/rulvar/classes/OrchestratorCapConfigError.md)
- [`PlanInvariantError`](/api/@rulvar/rulvar/classes/PlanInvariantError.md)
- [`ReplayPlanHashMismatch`](/api/@rulvar/rulvar/classes/ReplayPlanHashMismatch.md)
- [`SandboxError`](/api/@rulvar/rulvar/classes/SandboxError.md)
- [`ScriptRejected`](/api/@rulvar/rulvar/classes/ScriptRejected.md)

## Constructors

### Constructor

```ts
new RulvarError(message, opts?): RulvarError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md); `retryable?`: `boolean`; \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |
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
| <a id="property-code"></a> `code` | `abstract` | [`ErrorCode`](/api/@rulvar/rulvar/type-aliases/ErrorCode.md) | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `packages/core/dist/index.d.ts` |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)
