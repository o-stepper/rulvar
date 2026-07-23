[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FailRunError

# Class: FailRunError

Defined in: [packages/core/src/l0/errors.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L267)

A declared fail-run policy engaged and closed the run as a failure
(v1.35.0 review P2-1): `budget.atCap: 'fail-run'` after the journaled
orchestrator cap decision, `guards.fallback: 'fail-run'` after the
journaled guard verdict, or a violated orchestrate acceptance policy
after the journaled acceptance decision (`data.source`
'orchestrator_acceptance', with the child status counts and degraded
reasons in `data`). The run outcome is 'error' with this code;
`data.source` names the policy ('orchestrator_budget_cap' or
'plan_guards') and `data` carries the decision entry reference, so the
outcome is a pure roll forward of the journal on resume: no second
decision, no model call, no spend.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new FailRunError(message, opts?): FailRunError;
```

Defined in: [packages/core/src/l0/errors.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L270)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`FailRunError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"fail_run"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L268) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L59) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L58) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L70)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
