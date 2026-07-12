[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / PinLedger

# Class: PinLedger

Defined in: [packages/plan/src/park.ts:25](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L25)

The worktree pin ledger: a pure fold counting live pins from abandon
entries carrying `retainWorktree: true` (park pinning and DEF-5
retention share the cap by construction).

## Constructors

### Constructor

```ts
new PinLedger(): PinLedger;
```

#### Returns

`PinLedger`

## Accessors

### count

#### Get Signature

```ts
get count(): number;
```

Defined in: [packages/plan/src/park.ts:43](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L43)

##### Returns

`number`

## Methods

### hasCapacity()

```ts
hasCapacity(maxPinnedWorktrees?): boolean;
```

Defined in: [packages/plan/src/park.ts:47](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L47)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `maxPinnedWorktrees` | `number` | `DEFAULT_MAX_PINNED_WORKTREES` |

#### Returns

`boolean`

***

### isPinnedNode()

```ts
isPinnedNode(nodeId): boolean;
```

Defined in: [packages/plan/src/park.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `nodeId` | `string` |

#### Returns

`boolean`

***

### fold()

```ts
static fold(entries): PinLedger;
```

Defined in: [packages/plan/src/park.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/park.ts#L29)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |

#### Returns

`PinLedger`
