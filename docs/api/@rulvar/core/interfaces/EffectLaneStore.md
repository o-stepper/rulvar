[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneStore

# Interface: EffectLaneStore

Defined in: [packages/core/src/l0/spi/store.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L274)

Effect lane capability (plan 45, rfcs/effects.md section 4.5, item
3): a store carrying a restoration generation OUTSIDE the journal
bytes. The restore procedure bumps it atomically BEFORE the restored
data becomes reachable, so a point-in-time-restored store comes up
with effect dispatch disabled by construction: the effect lane
writer validates the store's generation against the one recorded in
the journal's latest `effect_epoch` decision and refuses every lane
append until an operator appends a fresh epoch citing the bumped
generation. One recorded deviation from the RFC's wording, with its
reason: the RFC asks the store itself to reject an UNLEASED effect
lane append, but stores are dumb byte stores that never parse
payloads (obligation A4) and cannot recognize lane traffic; the
unleased half is therefore enforced by the writer's construction
(no lane append path exists without the lease) plus the conformance
kit over the writer-store composition, while the superseded-lease
half is exactly the shipped `fencedWrites` contract.

## Extends

- [`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-effectlane"></a> `effectLane` | `readonly` | `true` | - | - | [packages/core/src/l0/spi/store.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L275) |
| <a id="property-fencedwrites"></a> `fencedWrites?` | `readonly` | `true` | Fenced writes capability (the fenced run state RFC, phase 2), optional exactly like `getMeta` and `leaseTtlMs`: a store declaring `fencedWrites: true` PROMISES that every mutation carrying a lease (`append`, `putMeta`, `delete`) verifies it is the CURRENT holder for the run the mutation targets, atomically with the mutation itself, and rejects with the typed LeaseHeldError leaving nothing mutated when it is not (stale epoch, foreign owner, expired, or a lease whose runId is not the mutation's run). The engine threads the segment's lease into every one of these writes on a leased resume, so over a declaring store a superseded worker cannot overwrite run meta or delete run state, exactly as it already cannot append. A mutation carrying NO lease keeps the single-writer semantics unchanged. Stores written before this capability are unaffected: without the marker the extra argument is ignored and hosts know the surface is advisory. | [`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`fencedWrites`](/api/@rulvar/core/interfaces/LeasableStore.md#property-fencedwrites) | [packages/core/src/l0/spi/store.ts:228](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L228) |
| <a id="property-leasettlms"></a> `leaseTtlMs?` | `readonly` | `number` | Optional TTL introspection (v1.35.0 review P2-4): the configured lease ttl in milliseconds. A store exposing it lets createWorker VERIFY at construction that the worker's renew cadence matches the store's expiry instead of trusting two config sources to agree; stores without it are accepted with the worker's own ttl. | [`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`leaseTtlMs`](/api/@rulvar/core/interfaces/LeasableStore.md#property-leasettlms) | [packages/core/src/l0/spi/store.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L291) |

## Methods

### acquire()

```ts
acquire(runId, owner): Promise<Lease>;
```

Defined in: [packages/core/src/l0/spi/store.ts:281](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L281)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `owner` | `string` |

#### Returns

`Promise`\&lt;[`Lease`](/api/@rulvar/core/type-aliases/Lease.md)\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`acquire`](/api/@rulvar/core/interfaces/LeasableStore.md#acquire)

***

### append()

```ts
append(
   runId, 
   e, 
lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L206)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `e` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`append`](/api/@rulvar/core/interfaces/LeasableStore.md#append)

***

### delete()

```ts
delete(runId, lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L210)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`delete`](/api/@rulvar/core/interfaces/LeasableStore.md#delete)

***

### listRuns()

```ts
listRuns(f?): Promise<RunMeta[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L209)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `f?` | [`RunFilter`](/api/@rulvar/core/type-aliases/RunFilter.md) |

#### Returns

`Promise`\&lt;[`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md)[]\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`listRuns`](/api/@rulvar/core/interfaces/LeasableStore.md#listruns)

***

### load()

```ts
load(runId): Promise<JournalEntry[]>;
```

Defined in: [packages/core/src/l0/spi/store.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L207)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `runId` | `string` |

#### Returns

`Promise`\&lt;[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`load`](/api/@rulvar/core/interfaces/LeasableStore.md#load)

***

### putMeta()

```ts
putMeta(m, lease?): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L208)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `m` | [`RunMeta`](/api/@rulvar/core/type-aliases/RunMeta.md) |
| `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`putMeta`](/api/@rulvar/core/interfaces/LeasableStore.md#putmeta)

***

### release()

```ts
release(l): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L283)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`release`](/api/@rulvar/core/interfaces/LeasableStore.md#release)

***

### renew()

```ts
renew(l): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/store.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L282)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `l` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) |

#### Returns

`Promise`\&lt;`void`\&gt;

#### Inherited from

[`LeasableStore`](/api/@rulvar/core/interfaces/LeasableStore.md).[`renew`](/api/@rulvar/core/interfaces/LeasableStore.md#renew)

***

### restorationGeneration()

```ts
restorationGeneration(): Promise<number>;
```

Defined in: [packages/core/src/l0/spi/store.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/store.ts#L277)

The current restoration generation; 0 until a restore ever ran.

#### Returns

`Promise`\&lt;`number`\&gt;
