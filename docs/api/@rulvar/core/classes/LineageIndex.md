[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LineageIndex

# Class: LineageIndex

Defined in: [packages/core/src/journal/lineage.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L355)

The incremental lineage fold: attempts, escalation debits, stall
streaks, single-live-attempt, and legacy canonization, computed from
journal entries only. `absorb` is idempotent by seq cursor; every read
accepts an optional `uptoSeq` pin so renders stay snapshot-stable
(docs/03, 10.4; docs/07, 8.3).

## Constructors

### Constructor

```ts
new LineageIndex(): LineageIndex;
```

#### Returns

`LineageIndex`

## Methods

### absorb()

```ts
absorb(entries): void;
```

Defined in: [packages/core/src/journal/lineage.ts:373](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L373)

Absorbs new entries (seq beyond the cursor); earlier ones are no-ops.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

#### Returns

`void`

***

### attemptsUsed()

```ts
attemptsUsed(logicalTaskId, uptoSeq?): number;
```

Defined in: [packages/core/src/journal/lineage.ts:682](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L682)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `logicalTaskId` | `string` | `undefined` |
| `uptoSeq` | `number` | `Number.POSITIVE_INFINITY` |

#### Returns

`number`

***

### escalationsUsed()

```ts
escalationsUsed(logicalTaskId, uptoSeq?): number;
```

Defined in: [packages/core/src/journal/lineage.ts:686](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L686)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `logicalTaskId` | `string` | `undefined` |
| `uptoSeq` | `number` | `Number.POSITIVE_INFINITY` |

#### Returns

`number`

***

### hasLiveAttempt()

```ts
hasLiveAttempt(logicalTaskId): boolean;
```

Defined in: [packages/core/src/journal/lineage.ts:700](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L700)

True while the LTID has an unsettled attempt (admitted, dispatched, or
redispatched without a terminal), including admits whose decision
entries have not landed yet. Backs the single-live-attempt invariant:
a competing admit gets `lineage_busy` (docs/03, 10.5).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

`boolean`

***

### knownLogicalTaskIds()

```ts
knownLogicalTaskIds(): string[];
```

Defined in: [packages/core/src/journal/lineage.ts:772](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L772)

Every LTID the fold has seen (diagnostics and renders).

#### Returns

`string`[]

***

### noteAdmitted()

```ts
noteAdmitted(logicalTaskId): void;
```

Defined in: [packages/core/src/journal/lineage.ts:368](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L368)

Registers a live admit strictly before its decision entry lands.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalTaskId` | `string` |

#### Returns

`void`

***

### stallStreak()

```ts
stallStreak(logicalTaskId, uptoSeq?): number;
```

Defined in: [packages/core/src/journal/lineage.ts:710](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L710)

The stall streak per docs/03, 10.4 (pinnable to a snapshot seq).

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `logicalTaskId` | `string` | `undefined` |
| `uptoSeq` | `number` | `Number.POSITIVE_INFINITY` |

#### Returns

`number`

***

### statsOf()

```ts
statsOf(logicalTaskId, uptoSeq?): LineageStats;
```

Defined in: [packages/core/src/journal/lineage.ts:734](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L734)

The pinned LineageStats render (docs/03, 10.3).

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `logicalTaskId` | `string` | `undefined` |
| `uptoSeq` | `number` | `Number.POSITIVE_INFINITY` |

#### Returns

[`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md)
