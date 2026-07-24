[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SettlementError

# Class: SettlementError

Defined in: [packages/core/src/l0/errors.ts:339](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L339)

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
rejection (LeaseHeldError) is NOT this error and stays swallowed:
the successor owns settlement. `data` records
{ runId, runStatus, stage }.

## Extends

- [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md)

## Constructors

### Constructor

```ts
new SettlementError(message, opts): SettlementError;
```

Defined in: [packages/core/src/l0/errors.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L347)

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

[`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`constructor`](/api/@rulvar/core/classes/RulvarError.md#constructor)

## Properties

| Property | Modifier | Type | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-code"></a> `code` | `readonly` | `"settlement"` | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`code`](/api/@rulvar/core/classes/RulvarError.md#property-code) | - | [packages/core/src/l0/errors.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L340) |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`data`](/api/@rulvar/core/classes/RulvarError.md#property-data) | [packages/core/src/l0/errors.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L60) |
| <a id="property-retryable"></a> `retryable` | `readonly` | `boolean` | - | - | [`RulvarError`](/api/@rulvar/core/classes/RulvarError.md).[`retryable`](/api/@rulvar/core/classes/RulvarError.md#property-retryable) | [packages/core/src/l0/errors.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L59) |
| <a id="property-runid"></a> `runId` | `readonly` | `string` | - | - | - | [packages/core/src/l0/errors.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L343) |
| <a id="property-runstatus"></a> `runStatus` | `readonly` | `string` | The outcome status the segment computed and could not record. | - | - | [packages/core/src/l0/errors.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L345) |
| <a id="property-stage"></a> `stage` | `readonly` | `"run-settle"` \| `"meta"` | The settlement write that failed first. | - | - | [packages/core/src/l0/errors.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/errors.ts#L342) |

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
