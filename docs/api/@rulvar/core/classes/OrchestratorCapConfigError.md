[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestratorCapConfigError

# Class: OrchestratorCapConfigError

Defined in: [packages/core/src/l0/errors.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L222)

Invalid orchestrator cap and finalize-reserve configuration, thrown
before the first LLM call (DEF-7; producers ship in M6/M7).

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new OrchestratorCapConfigError(message, opts?): OrchestratorCapConfigError;
```

Defined in: [packages/core/src/l0/errors.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L225)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`OrchestratorCapConfigError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"orchestrator_cap_config"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L223) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L60) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L59) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L71)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
