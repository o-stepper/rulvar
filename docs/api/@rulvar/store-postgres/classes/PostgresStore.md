[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / PostgresStore

# Class: PostgresStore

Defined in: [packages/store-postgres/src/store.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L125)

@rulvar/store-postgres: PostgresStore implementing JournalStore and
LeasableStore with fencing epochs over node-postgres, for
multi-process and multi-host deployments (RV-214). Payloads stay
opaque TEXT (A4); every run-scoped mutation serializes on a per-run
advisory transaction lock so the fence check and the guarded
mutation commit as one unit across hosts.

## Implements

- [`MetaLookupStore`](/api/@rulvar/rulvar/interfaces/MetaLookupStore.md)
- [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md)

## Constructors

### Constructor

```ts
new PostgresStore(options): PostgresStore;
```

Defined in: [packages/store-postgres/src/store.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L145)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`PostgresStoreOptions`](/api/@rulvar/store-postgres/interfaces/PostgresStoreOptions.md) |

#### Returns

`PostgresStore`

## Properties

| Property | Modifier | Type | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-fencedwrites"></a> `fencedWrites` | `readonly` | `true` | The fenced writes promise (fenced run state RFC, phase 2). | [packages/store-postgres/src/store.ts:127](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L127) |

## Accessors

### leaseTtlMs

#### Get Signature

```ts
get leaseTtlMs(): number;
```

Defined in: [packages/store-postgres/src/store.ts:572](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L572)

TTL introspection (the LeasableStore optional capability).

##### Returns

`number`

Optional TTL introspection (v1.35.0 review P2-4): the configured
lease ttl in milliseconds. A store exposing it lets createWorker
VERIFY at construction that the worker's renew cadence matches the
store's expiry instead of trusting two config sources to agree;
stores without it are accepted with the worker's own ttl.

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`leaseTtlMs`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#property-leasettlms)

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/store-postgres/src/store.ts:576](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L576)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md)\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`acquire`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#acquire)

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:393](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L393)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`append`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#append)

***

### close()

```ts
close(): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L289)

#### Returns

`Promise`\&lt;`void`\&gt;

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:490](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L490)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#delete)

***

### getMeta()

```ts
getMeta(runId): Promise<RunMeta | undefined>;
```

Defined in: [packages/store-postgres/src/store.ts:436](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L436)

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

Defined in: [packages/store-postgres/src/store.ts:445](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L445)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md)[]\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/store-postgres/src/store.ts:407](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L407)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`load`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#load)

***

### putMeta()

```ts
putMeta(m, lease?): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:426](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L426)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:620](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L620)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`release`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#release)

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: [packages/store-postgres/src/store.ts:608](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L608)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Implementation of

[`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/LeasableStore.md#renew)

***

### transcripts()

```ts
transcripts(): PostgresTranscriptStore;
```

Defined in: [packages/store-postgres/src/store.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/store.ts#L509)

The fenced transcript twin (RFC F2): blobs live in this store's
database beside the lease rows, so a lease-carrying put or delete
verifies the current holder of the run the ref's leading path
segment names atomically with the blob mutation. Wire it as the
engine's transcript store next to this store as the journal;
`assertFencedWrites({ journal, transcripts })` verifies the pair.

#### Returns

[`PostgresTranscriptStore`](/api/@rulvar/store-postgres/interfaces/PostgresTranscriptStore.md)
