[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SandboxError

# Class: SandboxError

Defined in: [packages/core/src/l0/errors.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L276)

A WorkerSandboxRunner resource-limit breach (M6-T02): crossing
timeoutMs or memoryMb terminates the worker and the
run completes with outcome 'error' carrying this error's WireError
projection; `data` records { reason: 'timeout' | 'memory', limit }.
The class itself is never journaled as an entry of its own.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new SandboxError(message, opts?): SandboxError;
```

Defined in: [packages/core/src/l0/errors.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L279)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`SandboxError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"sandbox_limit"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L277) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L57) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L56) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L68)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
