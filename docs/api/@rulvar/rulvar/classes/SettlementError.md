[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SettlementError

# Class: SettlementError

Defined in: `packages/core/dist/index.d.ts`

The segment computed its outcome but a settlement write failed with a
NON-fencing store error, so nothing durable records that the run
settled. `handle.result` rejects with this instead of resolving,
because a caller acting on an unrecorded outcome is exactly the split
view an authoritative store exists to prevent. `stage` names the
write that failed: 'run-settle' is the journal decision entry (when
it fails the terminal meta write is SKIPPED, so the projection can
never run ahead of the journal), 'meta' is the terminal RunMeta
projection (the journal settle IS durable; only the projection is
behind, the same residue a crash between the two writes leaves).
Every entry the run appended before settlement is already durable,
so recovery is deterministic: resume the run and replay re-settles
the same outcome without a provider call, or reconcile the store
with `rulvar runs audit [--repair]`. A superseded segment's fencing
rejection of the settle append (LeaseHeldError) is NOT this error:
it rejects with the typed [SupersededError](/api/@rulvar/rulvar/classes/SupersededError.md) (RV1009), while a
meta-only lease bounce over an already durable settle stays
swallowed (the journal records the outcome; only the projection
belongs to the current holder). `data` records
{ runId, runStatus, stage }.

## Extends

- [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new SettlementError(message, opts): SettlementError;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts` | \{ `cause?`: `unknown`; `runId`: `string`; `runStatus`: `string`; `stage`: `"run-settle"` \| `"meta"`; \} |
| `opts.cause?` | `unknown` |
| `opts.runId` | `string` |
| `opts.runStatus` | `string` |
| `opts.stage` | `"run-settle"` \| `"meta"` |

#### Returns

`SettlementError`

#### Overrides

[`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`constructor`](/api/@rulvar/rulvar/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"settlement"` | `"settlement"` | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`code`](/api/@rulvar/rulvar/classes/RulvarError.md#property-code) | - | `packages/core/dist/index.d.ts` |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`data`](/api/@rulvar/rulvar/classes/RulvarError.md#property-data) | `packages/core/dist/index.d.ts` |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | `undefined` | - | - | [`RulvarError`](/api/@rulvar/rulvar/classes/RulvarError.md).[`retryable`](/api/@rulvar/rulvar/classes/RulvarError.md#property-retryable) | `packages/core/dist/index.d.ts` |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | `undefined` | - | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-runstatus"></a> `runStatus` | `readonly` | `string` | `undefined` | The outcome status the segment computed and could not record. | - | - | `packages/core/dist/index.d.ts` |
| <a id="property-stage"></a> `stage` | `readonly` | `"run-settle"` \| `"meta"` | `undefined` | The settlement write that failed first. | - | - | `packages/core/dist/index.d.ts` |

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
