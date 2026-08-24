[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneRefusedError

# Class: EffectLaneRefusedError

Defined in: [packages/core/src/l0/errors.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L372)

The effect lane refused an operation, typed and fail closed (plan
45, rfcs/effects.md): a consumption whose verdict no longer holds, a
dispatch the state table forbids (re-dispatch after a revocation), a
budget the intent has exhausted, an intake the protocol rejects (an
effect approval without a deadline), or a store without the
capabilities the lane requires. Never retryable by the engine's wire
machinery: the lane's own recovery rules (reload, find the operation
id, re-verdict) are the only legal retry, and they live in the
writer, not in RetryPolicy.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new EffectLaneRefusedError(
   rule, 
   message, 
   opts?): EffectLaneRefusedError;
```

Defined in: [packages/core/src/l0/errors.ts:377](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L377)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `rule` | `string` |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`EffectLaneRefusedError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"effect_refused"` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L373) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L64) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L63) |
| <a id="property-rule"></a> `rule` | `readonly` | `string` | The protocol rule that refused, kebab-case, stable. | - | - | [packages/core/src/l0/errors.ts:375](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L375) |

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
