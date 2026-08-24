[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / JournalIntegrityError

# Class: JournalIntegrityError

Defined in: [packages/core/src/l0/errors.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L288)

A journal append was lost before the settle (RV3201): a persist
inside the serialized append queue rejected, and the queue swallowed
the rejection to keep later appends flowing, so the journal is now
missing an entry the run believes it wrote. The first such failure
latches inside the Replayer: every `flush()` from that moment
rethrows it, and the engine settle path converts a would-be ok (or
suspended) outcome into an error terminal, because an ok settle over
a lost deterministic record would replay differently than the run
executed. The latch is permanent for the segment; a resume constructs
a fresh Replayer against whatever the store actually holds.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new JournalIntegrityError(message, opts?): JournalIntegrityError;
```

Defined in: [packages/core/src/l0/errors.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L291)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `cause?`: `unknown`; `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.cause?` | `unknown` |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`JournalIntegrityError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"journal_integrity"` | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L289) |
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
