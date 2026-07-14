[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / KnowledgeCasError

# Class: KnowledgeCasError

Defined in: `packages/core/dist/index.d.ts`

commit() on a ModelKnowledgeStore against a snapshot version that is
no longer current. Retryable by contract: re-read current(), rebase
the ops, commit again, mirroring the lease fencing discipline.

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new KnowledgeCasError(message, opts?): KnowledgeCasError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`KnowledgeCasError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"knowledge_cas"` | `"knowledge_cas"` | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`WireError`](/api/@rulvar/rulvar/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`toWire`](/api/@rulvar/rulvar/classes/RulvarError.md#towire)
