[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / RestorableEffectLaneStore

# Interface: RestorableEffectLaneStore

Defined in: [packages/store-conformance/src/effect-lane.ts:26](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/effect-lane.ts#L26)

The store shape under test: the capability plus the restore verb.

## Extends

- [`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-effectlane"></a> `effectLane` | `readonly` | `true` | - | [`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`effectLane`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#property-effectlane) | `packages/core/dist/index.d.ts` |
| <a id="property-fencedwrites"></a> `fencedWrites?` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), optional exactly like `getMeta` and `leaseTtlMs`: a store declaring `fencedWrites: true` PROMISES that every mutation carrying a lease (`append`, `putMeta`, `delete`) verifies it is the CURRENT holder for the run the mutation targets, atomically with the mutation itself, and rejects with the typed LeaseHeldError leaving nothing mutated when it is not (stale epoch, foreign owner, expired, or a lease whose runId is not the mutation's run). The engine threads the segment's lease into every one of these writes on a leased resume, so over a declaring store a superseded worker cannot overwrite run meta or delete run state, exactly as it already cannot append. A mutation carrying NO lease keeps the single-writer semantics unchanged. Stores written before this capability are unaffected: without the marker the extra argument is ignored and hosts know the surface is advisory. | [`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`fencedWrites`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#property-fencedwrites) | `packages/core/dist/index.d.ts` |
| <a id="property-leasettlms"></a> `leaseTtlMs?` | `readonly` | `number` | Optional TTL introspection (v1.35.0 review P2-4): the configured lease ttl in milliseconds. A store exposing it lets createWorker VERIFY at construction that the worker's renew cadence matches the store's expiry instead of trusting two config sources to agree; stores without it are accepted with the worker's own ttl. | [`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`leaseTtlMs`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#property-leasettlms) | `packages/core/dist/index.d.ts` |

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md)\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`acquire`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#acquire)

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`append`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#append)

***

### bumpRestorationGeneration()

```ts
bumpRestorationGeneration(): Promise<number>;
```

Defined in: [packages/store-conformance/src/effect-lane.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/effect-lane.ts#L27)

#### Returns

`Promise`\&lt;`number`\&gt;

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`delete`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/rulvar/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md)[]\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`listRuns`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[]\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`load`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#load)

***

### putMeta()

```ts
putMeta(m, lease?): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/rulvar/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`putMeta`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`release`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#release)

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`renew`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#renew)

***

### restorationGeneration()

```ts
restorationGeneration(): Promise<number>;
```

Defined in: `packages/core/dist/index.d.ts`

The current restoration generation; 0 until a restore ever ran.

#### Returns

`Promise`\&lt;`number`\&gt;

#### Inherited from

[`EffectLaneStore`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md).[`restorationGeneration`](/api/@rulvar/rulvar/interfaces/EffectLaneStore.md#restorationgeneration)
