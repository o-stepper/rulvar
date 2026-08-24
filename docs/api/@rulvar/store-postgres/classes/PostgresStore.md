[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresStore

# Class: PostgresStore

Defined in: [packages/store-postgres/src/store.ts:129](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L129)

@rulvar/store-postgres: PostgresStore implementing JournalStore and
LeasableStore with fencing epochs over node-postgres, for
multi-process and multi-host deployments (RV-214). Payloads stay
opaque TEXT (A4); every run-scoped mutation serializes on a per-run
advisory transaction lock so the fence check and the guarded
mutation commit as one unit across hosts. Beside it,
PostgresQuotaLimiter (RV410) is the multi-host reference of the core
QuotaLimiter SPI: one database, one schema, one global provider
quota, admission serialized on a schema-wide advisory lock.

## Implements

- [`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md)
- [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)
- [`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md)

## Constructors

### Constructor

```ts
new PostgresStore(options): PostgresStore;
```

Defined in: [packages/store-postgres/src/store.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L159)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`PostgresStoreOptions`](/api/@rulvar/store-postgres/interfaces/PostgresStoreOptions.md) |

#### Returns

`PostgresStore`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-effectlane"></a> `effectLane` | `readonly` | `true` | Effect lane capability (plan 45, rfcs/effects.md section 4.5, item 3): the restoration generation lives OUTSIDE the journal bytes in the same schema. The restore runbook is one rule: after a point-in-time restore, run bumpRestorationGeneration() BEFORE the restored database becomes reachable to any worker, so the effect lane comes up with dispatch disabled until an operator appends a fresh effect_epoch citing the bumped generation. | [packages/store-postgres/src/store.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L141) |
| <a id="property-fencedwrites"></a> `fencedWrites` | `readonly` | `true` | The fenced writes promise (fenced run state RFC, phase 2). | [packages/store-postgres/src/store.ts:131](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L131) |

## Accessors

### leaseTtlMs

#### Get Signature

```ts
get leaseTtlMs(): number;
```

Defined in: [packages/store-postgres/src/store.ts:622](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L622)

TTL introspection (the LeasableStore optional capability).

##### Returns

`number`

Optional TTL introspection (v1.35.0 review P2-4): the configured
lease ttl in milliseconds. A store exposing it lets createWorker
VERIFY at construction that the worker's renew cadence matches the
store's expiry instead of trusting two config sources to agree;
stores without it are accepted with the worker's own ttl.

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`leaseTtlMs`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#property-leasettlms)

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/store-postgres/src/store.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L626)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md)\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`acquire`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#acquire)

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:443](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L443)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`append`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#append)

***

### bumpRestorationGeneration()

```ts
bumpRestorationGeneration(): Promise<number>;
```

Defined in: [packages/store-postgres/src/store.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L332)

The restore procedure's one mutation (plan 45, rfcs/effects.md
section 4.5, item 3): after a point-in-time restore, bump the
generation BEFORE the restored database becomes reachable to any
worker, so the effect lane comes up with dispatch disabled until
an operator appends a fresh effect_epoch citing the bumped
generation. Every extra bump only widens the fence.

#### Returns

`Promise`\&lt;`number`\&gt;

***

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:309](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L309)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:540](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L540)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/store-postgres/src/store.ts:486](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L486)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) \| `undefined`\&gt;

#### Implementation of

[`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md).[`getMeta`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md#getmeta)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/store-postgres/src/store.ts:495](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L495)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/store-postgres/src/store.ts:457](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L457)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`load`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#load)

***

### putMeta()

```ts
putMeta(m, lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:476](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L476)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:670](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L670)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`release`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#release)

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:658](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L658)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#renew)

***

### restorationGeneration()

```ts
restorationGeneration(): Promise<number>;
```

Defined in: [packages/store-postgres/src/store.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L314)

The current restoration generation; 0 until a restore ever ran.

#### Returns

`Promise`\&lt;`number`\&gt;

#### Implementation of

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`restorationGeneration`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#restorationgeneration)

***

### transcripts()

```ts
transcripts(): PostgresTranscriptStore;
```

Defined in: [packages/store-postgres/src/store.ts:559](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L559)

The fenced transcript twin (RFC F2): blobs live in this store's
database beside the lease rows, so a lease-carrying put or delete
verifies the current holder of the run the ref's leading path
segment names atomically with the blob mutation. Wire it as the
engine's transcript store next to this store as the journal;
`assertFencedWrites({ journal, transcripts })` verifies the pair.

#### Returns

[`PostgresTranscriptStore`](/api/@rulvar/store-postgres/interfaces/PostgresTranscriptStore.md)
