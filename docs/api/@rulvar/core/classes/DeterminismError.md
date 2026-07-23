[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DeterminismError

# Class: DeterminismError

Defined in: [packages/core/src/l0/errors.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L344)

A workflow-origin bare-nondeterminism violation under
`determinism.mode: 'error'` (RV-209): bare `Date.now()` or
`Math.random()` called from workflow code inside a run. Thrown at the
offending call site (and re-thrown at settle if the workflow swallowed
it), so the run rejects instead of recording a value replay cannot
reproduce. `data` carries the structured localization: `category`,
`frame`, and the parsed `file`/`line`/`column` when the frame names
one. Never journaled as its own entry; the run settles 'error' with
this wire error. Exempt provenances (installed dependencies, Node
runtime frames, allowlisted patterns) never raise it.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new DeterminismError(message, opts?): DeterminismError;
```

Defined in: [packages/core/src/l0/errors.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L347)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`DeterminismError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"determinism"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L345) |
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
