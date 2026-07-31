[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SupersededError

# Class: SupersededError

Defined in: `packages/core/dist/index.d.ts`

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

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new SupersededError(message, opts): SupersededError;
```

Defined in: `packages/core/dist/index.d.ts`

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

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"superseded"` | `"superseded"` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-runstatus"></a> `runStatus` | `readonly` | `string` | `undefined` | The outcome status the stale segment computed and must not act on. | - | - | `packages/core/dist/index.d.ts` |

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
