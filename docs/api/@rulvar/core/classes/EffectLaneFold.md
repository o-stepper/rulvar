[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EffectLaneFold

# Class: EffectLaneFold

Defined in: [packages/core/src/effects/fold.ts:223](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L223)

## Constructors

### Constructor

```ts
new EffectLaneFold(entries, resolutions?): EffectLaneFold;
```

Defined in: [packages/core/src/effects/fold.ts:239](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L239)

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

Defined in: [packages/core/src/effects/fold.ts:271](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L271)

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

Defined in: [packages/core/src/effects/fold.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L288)

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

Defined in: [packages/core/src/effects/fold.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L284)

#### Returns

  \| [`EffectEpochState`](/api/@rulvar/core/interfaces/EffectEpochState.md)
  \| `undefined`

***

### declarations()

```ts
declarations(): EffectDeclarationState[];
```

Defined in: [packages/core/src/effects/fold.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L292)

#### Returns

[`EffectDeclarationState`](/api/@rulvar/core/interfaces/EffectDeclarationState.md)[]

***

### epochs()

```ts
epochs(): EffectEpochState[];
```

Defined in: [packages/core/src/effects/fold.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L280)

#### Returns

[`EffectEpochState`](/api/@rulvar/core/interfaces/EffectEpochState.md)[]

***

### machineAt()

```ts
machineAt(intentSeq): 
  | EffectMachine
  | undefined;
```

Defined in: [packages/core/src/effects/fold.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L266)

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

Defined in: [packages/core/src/effects/fold.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L262)

#### Returns

[`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)[]

***

### openMachines()

```ts
openMachines(): EffectMachine[];
```

Defined in: [packages/core/src/effects/fold.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L306)

Consumed machines that have not reached a terminal.

#### Returns

[`EffectMachine`](/api/@rulvar/core/interfaces/EffectMachine.md)[]

***

### standaloneQuarantines()

```ts
standaloneQuarantines(): StandaloneQuarantine[];
```

Defined in: [packages/core/src/effects/fold.ts:301](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L301)

Sweep-recorded quarantines with no machine (kill 25's remainder).

#### Returns

[`StandaloneQuarantine`](/api/@rulvar/core/interfaces/StandaloneQuarantine.md)[]

***

### standaloneRefusals()

```ts
standaloneRefusals(): StandaloneRefusal[];
```

Defined in: [packages/core/src/effects/fold.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/effects/fold.ts#L296)

#### Returns

[`StandaloneRefusal`](/api/@rulvar/core/interfaces/StandaloneRefusal.md)[]
