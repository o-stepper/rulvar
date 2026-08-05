[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SupersededError

# Class: SupersededError

Defined in: [packages/core/src/l0/errors.ts:400](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L400)

The segment computed its outcome but its run_settle append bounced
off the store's fence (LeaseHeldError): a successor segment holds
the lease and owns settlement (RV1009). Nothing durable records
THIS segment's outcome, so `handle.result` rejects with this error
instead of resolving, and the segment's run:end refuses green with
`settled: false` and `settledReason: 'superseded'`: a green
terminal that exists in no durable store is exactly the split view
RV907 forbids, and before this error a superseded segment resolved
ok silently. Not retryable: the successor owns the run; read the
authoritative outcome from its settle or the store's run meta. A
meta-only lease bounce over an already durable settle is NOT this
error and stays swallowed: the journal records the outcome, and
only the projection belongs to the current holder. `data` records
{ runId, runStatus }.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new SupersededError(message, opts): SupersededError;
```

Defined in: [packages/core/src/l0/errors.ts:406](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L406)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts` | \{ `cause?`: `unknown`; `runId`: `string`; `runStatus`: `string`; \} |
| `opts.cause?` | `unknown` |
| `opts.runId` | `string` |
| `opts.runStatus` | `string` |

#### Returns

`SupersededError`

#### Overrides

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"superseded"` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:401](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L401) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L62) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L61) |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | - | - | [packages/core/src/l0/errors.ts:402](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L402) |
| <a id="property-runstatus"></a> `runStatus` | `readonly` | `string` | The outcome status the stale segment computed and must not act on. | - | - | [packages/core/src/l0/errors.ts:404](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L404) |

## Methods

### toWire()

```ts
toWire(): WireError;
```

Defined in: [packages/core/src/l0/errors.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L73)

#### Returns

[`WireError`](/api/@rulvar/core/type-aliases/WireError.md)

#### Inherited from

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`toWire`](/api/@rulvar/core/classes/RulvarError.md#towire)
