[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FailRunError

# Class: FailRunError

Defined in: [packages/core/src/l0/errors.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L263)

A declared fail-run policy engaged and closed the run as a failure
(v1.35.0 review P2-1): `budget.atCap: 'fail-run'` after the journaled
orchestrator cap decision, or `guards.fallback: 'fail-run'` after the
journaled guard verdict. The run outcome is 'error' with this code;
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

Defined in: [packages/core/src/l0/errors.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L266)

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
| <a id="property-code"></a> `code` | `readonly` | `"fail_run"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L264) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L58) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L57) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L69)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
