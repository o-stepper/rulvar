[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / DedupIndex

# Class: DedupIndex

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`AbandonedSpendView`](/api/@rulvar/rulvar/interfaces/AbandonedSpendView.md)

***

### allDonorsOf()

```ts
allDonorsOf(spawnKey): DonorCandidate[];
```

Defined in: `packages/core/dist/index.d.ts`

Every donor for a key including claimed ones (diagnostics).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |

#### Returns

[`DonorCandidate`](/api/@rulvar/rulvar/interfaces/DonorCandidate.md)[]

***

### donorsOf()

```ts
donorsOf(spawnKey): DonorCandidate[];
```

Defined in: `packages/core/dist/index.d.ts`

Unclaimed donor candidates for a key, oldest (chain head) first.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spawnKey` | `string` |

#### Returns

[`DonorCandidate`](/api/@rulvar/rulvar/interfaces/DonorCandidate.md)[]

***

### oscillationCountOf()

```ts
oscillationCountOf(spawnKey): number;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `options?` | \{ `priceUsd?`: (`servedBy`, `usage`) => `number` \| `undefined`; \} |
| `options.priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` |

#### Returns

`DedupIndex`
