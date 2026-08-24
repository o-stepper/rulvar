[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EffectLaneFold

# Class: EffectLaneFold

Defined in: `packages/core/dist/index.d.ts`

## Constructors

### Constructor

```ts
new EffectLaneFold(entries, resolutions?): EffectLaneFold;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md)[] |
| `resolutions?` | [`ResolutionFold`](/api/@rulvar/rulvar/classes/ResolutionFold.md) |

#### Returns

`EffectLaneFold`

## Methods

### canonicalIntent()

```ts
canonicalIntent(logicalKey): 
  | EffectMachine
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

The consumed intent holding `logicalKey` in the CURRENT epoch.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalKey` | `string` |

#### Returns

  \| [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md)
  \| `undefined`

***

### classificationOf()

```ts
classificationOf(seq): 
  | EffectLaneClassification
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seq` | `number` |

#### Returns

  \| [`EffectLaneClassification`](/api/@rulvar/rulvar/type-aliases/EffectLaneClassification.md)
  \| `undefined`

***

### currentEpoch()

```ts
currentEpoch(): 
  | EffectEpochState
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

  \| [`EffectEpochState`](/api/@rulvar/rulvar/interfaces/EffectEpochState.md)
  \| `undefined`

***

### declarations()

```ts
declarations(): EffectDeclarationState[];
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`EffectDeclarationState`](/api/@rulvar/rulvar/interfaces/EffectDeclarationState.md)[]

***

### epochs()

```ts
epochs(): EffectEpochState[];
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`EffectEpochState`](/api/@rulvar/rulvar/interfaces/EffectEpochState.md)[]

***

### machineAt()

```ts
machineAt(intentSeq): 
  | EffectMachine
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |

#### Returns

  \| [`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md)
  \| `undefined`

***

### machines()

```ts
machines(): EffectMachine[];
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md)[]

***

### openMachines()

```ts
openMachines(): EffectMachine[];
```

Defined in: `packages/core/dist/index.d.ts`

Consumed machines that have not reached a terminal.

#### Returns

[`EffectMachine`](/api/@rulvar/rulvar/interfaces/EffectMachine.md)[]

***

### standaloneQuarantines()

```ts
standaloneQuarantines(): StandaloneQuarantine[];
```

Defined in: `packages/core/dist/index.d.ts`

Sweep-recorded quarantines with no machine (kill 25's remainder).

#### Returns

[`StandaloneQuarantine`](/api/@rulvar/rulvar/interfaces/StandaloneQuarantine.md)[]

***

### standaloneRefusals()

```ts
standaloneRefusals(): StandaloneRefusal[];
```

Defined in: `packages/core/dist/index.d.ts`

#### Returns

[`StandaloneRefusal`](/api/@rulvar/rulvar/interfaces/StandaloneRefusal.md)[]
