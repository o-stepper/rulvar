[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / LineageIndex

# Class: LineageIndex

Defined in: [packages/core/src/journal/lineage.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L354)

The incremental lineage fold: attempts, escalation debits, stall
streaks, single-live-attempt, and legacy canonization, computed from
journal entries only. `absorb` is idempotent by seq cursor; every read
accepts an optional `uptoSeq` pin so renders stay snapshot-stable.

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

Defined in: [packages/core/src/journal/lineage.ts:372](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L372)

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

Defined in: [packages/core/src/journal/lineage.ts:681](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L681)

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

Defined in: [packages/core/src/journal/lineage.ts:685](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L685)

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

Defined in: [packages/core/src/journal/lineage.ts:699](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L699)

True while the LTID has an unsettled attempt (admitted, dispatched, or
redispatched without a terminal), including admits whose decision
entries have not landed yet. Backs the single-live-attempt invariant:
a competing admit gets `lineage_busy`.

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

Defined in: [packages/core/src/journal/lineage.ts:771](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L771)

Every LTID the fold has seen (diagnostics and renders).

#### Returns

`string`[]

***

### noteAdmitted()

```ts
noteAdmitted(logicalTaskId): void;
```

Defined in: [packages/core/src/journal/lineage.ts:367](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L367)

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

Defined in: [packages/core/src/journal/lineage.ts:709](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L709)

The stall streak (pinnable to a snapshot seq).

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

Defined in: [packages/core/src/journal/lineage.ts:733](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/lineage.ts#L733)

The pinned LineageStats render.

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `logicalTaskId` | `string` | `undefined` |
| `uptoSeq` | `number` | `Number.POSITIVE_INFINITY` |

#### Returns

[`LineageStats`](/api/@rulvar/core/interfaces/LineageStats.md)
