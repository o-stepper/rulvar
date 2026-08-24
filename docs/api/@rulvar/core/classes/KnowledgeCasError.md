[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / KnowledgeCasError

# Class: KnowledgeCasError

Defined in: [packages/core/src/l0/errors.ts:466](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L466)

commit() on a ModelKnowledgeStore against a snapshot version that is
no longer current. Retryable by contract: re-read current(), rebase
the ops, commit again, mirroring the lease fencing discipline.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new KnowledgeCasError(message, opts?): KnowledgeCasError;
```

Defined in: [packages/core/src/l0/errors.ts:469](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L469)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`KnowledgeCasError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"knowledge_cas"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:467](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L467) |
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
