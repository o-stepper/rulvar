[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ConfigError

# Class: ConfigError

Defined in: `packages/core/dist/index.d.ts`

Construction- and definition-time misconfiguration: duplicate adapterId,
non-git host for worktree isolation, worker over a non-leasable store,
failed schema projection. Never journaled; raised before any run effect.

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new ConfigError(message, opts?): ConfigError;
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

`ConfigError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"config"` | `"config"` | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
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
