[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneFold

# Class: EffectLaneFold

Defined in: [packages/core/src/effects/fold.ts:191](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L191)

## Constructors

### Constructor

```ts
new EffectLaneFold(entries, resolutions?): EffectLaneFold;
```

Defined in: [packages/core/src/effects/fold.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L206)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |
| `resolutions?` | [`ResolutionFold`](/api/@rulvar/core/classes/ResolutionFold.md) |

#### Returns

`EffectLaneFold`

## Methods

### canonicalIntent()

```ts
canonicalIntent(logicalKey): 
  | EffectMachine
  | undefined;
```

Defined in: [packages/core/src/effects/fold.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L238)

The consumed intent holding `logicalKey` in the CURRENT epoch.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalKey` | `string` |

#### Returns

  \| [`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)
  \| `undefined`

***

### classificationOf()

```ts
classificationOf(seq): 
  | EffectLaneClassification
  | undefined;
```

Defined in: [packages/core/src/effects/fold.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L255)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seq` | `number` |

#### Returns

  \| [`EffectLaneClassification`](/api/@rulvar/core/type-aliases/EffectLaneClassification.md)
  \| `undefined`

***

### currentEpoch()

```ts
currentEpoch(): 
  | EffectEpochState
  | undefined;
```

Defined in: [packages/core/src/effects/fold.ts:251](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L251)

#### Returns

  \| [`EffectEpochState`](/api/@rulvar/core/interfaces/EffectEpochState.md)
  \| `undefined`

***

### declarations()

```ts
declarations(): EffectDeclarationState[];
```

Defined in: [packages/core/src/effects/fold.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L259)

#### Returns

[`EffectDeclarationState`](/api/@rulvar/core/interfaces/EffectDeclarationState.md)[]

***

### epochs()

```ts
epochs(): EffectEpochState[];
```

Defined in: [packages/core/src/effects/fold.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L247)

#### Returns

[`EffectEpochState`](/api/@rulvar/core/interfaces/EffectEpochState.md)[]

***

### machineAt()

```ts
machineAt(intentSeq): 
  | EffectMachine
  | undefined;
```

Defined in: [packages/core/src/effects/fold.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L233)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |

#### Returns

  \| [`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)
  \| `undefined`

***

### machines()

```ts
machines(): EffectMachine[];
```

Defined in: [packages/core/src/effects/fold.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L229)

#### Returns

[`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)[]

***

### openMachines()

```ts
openMachines(): EffectMachine[];
```

Defined in: [packages/core/src/effects/fold.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L268)

Consumed machines that have not reached a terminal.

#### Returns

[`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)[]

***

### standaloneRefusals()

```ts
standaloneRefusals(): StandaloneRefusal[];
```

Defined in: [packages/core/src/effects/fold.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L263)

#### Returns

[`StandaloneRefusal`](/api/@rulvar/core/interfaces/StandaloneRefusal.md)[]
