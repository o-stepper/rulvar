[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ReplayPlanHashMismatch

# Class: ReplayPlanHashMismatch

Defined in: [packages/core/src/l0/errors.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L214)

Raised at resume when the refolded plan state disagrees with the
journaled planHash chain (producers ship in M7).

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new ReplayPlanHashMismatch(message, opts?): ReplayPlanHashMismatch;
```

Defined in: [packages/core/src/l0/errors.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L217)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`ReplayPlanHashMismatch`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"replay_plan_hash_mismatch"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:215](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L215) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L64) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L63) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L75)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
