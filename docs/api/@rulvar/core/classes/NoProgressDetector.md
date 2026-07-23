[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / NoProgressDetector

# Class: NoProgressDetector

Defined in: [packages/core/src/runtime/no-progress.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L41)

Counts consecutive progress-free turns. A turn with at least one tool
call (or, later, an artifact delta) resets the streak; a turn with
neither lengthens it; the detector trips when the streak reaches the
threshold AND the loop would otherwise continue.

## Constructors

### Constructor

```ts
new NoProgressDetector(threshold?): NoProgressDetector;
```

Defined in: [packages/core/src/runtime/no-progress.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L45)

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

Defined in: [packages/core/src/runtime/no-progress.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L49)

##### Returns

`number`

***

### tripped

#### Get Signature

```ts
get tripped(): boolean;
```

Defined in: [packages/core/src/runtime/no-progress.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L62)

##### Returns

`boolean`

## Methods

### describe()

```ts
describe(): string;
```

Defined in: [packages/core/src/runtime/no-progress.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L66)

#### Returns

`string`

***

### recordTurn()

```ts
recordTurn(progress): void;
```

Defined in: [packages/core/src/runtime/no-progress.ts:54](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L54)

Records one completed model turn.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `progress` | \{ `artifactDeltas?`: `number`; `toolCalls`: `number`; \} |
| `progress.artifactDeltas?` | `number` |
| `progress.toolCalls` | `number` |

#### Returns

`void`
