[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / NoProgressDetector

# Class: NoProgressDetector

Defined in: [packages/core/src/runtime/no-progress.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L31)

Counts consecutive progress-free turns. A turn with at least one tool
call (or, later, an artifact delta) resets the streak; a turn with
neither lengthens it; the detector trips when the streak reaches the
threshold AND the loop would otherwise continue.

## Constructors

### Constructor

```ts
new NoProgressDetector(threshold?): NoProgressDetector;
```

Defined in: [packages/core/src/runtime/no-progress.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L35)

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

Defined in: [packages/core/src/runtime/no-progress.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L39)

##### Returns

`number`

***

### tripped

#### Get Signature

```ts
get tripped(): boolean;
```

Defined in: [packages/core/src/runtime/no-progress.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L52)

##### Returns

`boolean`

## Methods

### describe()

```ts
describe(): string;
```

Defined in: [packages/core/src/runtime/no-progress.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L56)

#### Returns

`string`

***

### recordTurn()

```ts
recordTurn(progress): void;
```

Defined in: [packages/core/src/runtime/no-progress.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/no-progress.ts#L44)

Records one completed model turn.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `progress` | \{ `artifactDeltas?`: `number`; `toolCalls`: `number`; \} |
| `progress.artifactDeltas?` | `number` |
| `progress.toolCalls` | `number` |

#### Returns

`void`
