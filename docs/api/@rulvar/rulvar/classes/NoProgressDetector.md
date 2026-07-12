[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / NoProgressDetector

# Class: NoProgressDetector

Defined in: `packages/core/dist/index.d.ts`

Counts consecutive progress-free turns. A turn with at least one tool
call (or, later, an artifact delta) resets the streak; a turn with
neither lengthens it; the detector trips when the streak reaches the
threshold AND the loop would otherwise continue.

## Constructors

### Constructor

```ts
new NoProgressDetector(threshold?): NoProgressDetector;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `threshold?` | `number` |

#### Returns

`NoProgressDetector`

## Accessors

### streak

#### Get Signature

```ts
get streak(): number;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`number`

***

### tripped

#### Get Signature

```ts
get tripped(): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

##### Returns

`boolean`

## Methods

### describe()

```ts
describe(): string;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

`string`

***

### recordTurn()

```ts
recordTurn(progress): void;
```

Defined in: `packages/core/dist/index.d.ts`

Records one completed model turn.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `progress` | \{ `artifactDeltas?`: `number`; `toolCalls`: `number`; \} |
| `progress.artifactDeltas?` | `number` |
| `progress.toolCalls` | `number` |

#### Returns

`void`
