[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DedupIndex

# Class: DedupIndex

Defined in: [packages/core/src/journal/reuse.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L158)

The DedupIndex: a pure fold over spawn roots, severing abandons, and
node.link entries. Prices fold from journal facts (servedBy, usage)
through the injected price function; on replay the embedded verdict
values are authoritative and this fold serves integrity only.

## Constructors

### Constructor

```ts
new DedupIndex(): DedupIndex;
```

#### Returns

`DedupIndex`

## Methods

### abandonedSpend()

```ts
abandonedSpend(): AbandonedSpendView;
```

Defined in: [packages/core/src/journal/reuse.ts:349](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L349)

#### Returns

[`AbandonedSpendView`](/api/@rulvar/core/interfaces/AbandonedSpendView.md)

***

### allDonorsOf()

```ts
allDonorsOf(spawnKey): DonorCandidate[];
```

Defined in: [packages/core/src/journal/reuse.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L340)

Every donor for a key including claimed ones (diagnostics).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |

#### Returns

[`DonorCandidate`](/api/@rulvar/core/interfaces/DonorCandidate.md)[]

***

### donorsOf()

```ts
donorsOf(spawnKey): DonorCandidate[];
```

Defined in: [packages/core/src/journal/reuse.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L333)

Unclaimed donor candidates for a key, oldest (chain head) first.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |

#### Returns

[`DonorCandidate`](/api/@rulvar/core/interfaces/DonorCandidate.md)[]

***

### oscillationCountOf()

```ts
oscillationCountOf(spawnKey): number;
```

Defined in: [packages/core/src/journal/reuse.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L345)

Link count per key: the oscillation counter.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |

#### Returns

`number`

***

### fold()

```ts
static fold(entries, options?): DedupIndex;
```

Defined in: [packages/core/src/journal/reuse.ts:170](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/reuse.ts#L170)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `options?` | \{ `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; \} |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` |

#### Returns

`DedupIndex`
