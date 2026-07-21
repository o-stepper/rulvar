[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScriptRejected

# Class: ScriptRejected

Defined in: [packages/core/src/l0/errors.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L112)

compileScript rejected planner-generated source. Never journaled as its
own entry; surfaced as diagnostics to the plan() self-repair loop
(producers ship in M6).

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new ScriptRejected(message, opts?): ScriptRejected;
```

Defined in: [packages/core/src/l0/errors.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L115)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`ScriptRejected`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"script_rejected"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:113](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L113) |
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
