[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionFold

# Class: ResolutionFold

Defined in: [packages/core/src/journal/resolution.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L91)

The first-closing-wins fold over a loaded journal: one pass by seq,
bit-identical on every store returning the same entries. Resolution
values are validated at consumption against the schema pinned INSIDE
the suspended entry payload (canonical bare JSON Schema); a
schema-invalid offline resolution classifies invalid and does NOT close
the target. Abandon coverage is the target seq plus the transitive
child scope-prefix; the AbandonFold consumed by the replay predicate is
a projection of THIS fold (not a separate pass).

## Constructors

### Constructor

```ts
new ResolutionFold(entries): ResolutionFold;
```

Defined in: [packages/core/src/journal/resolution.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L98)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entries` | readonly [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[] |

#### Returns

`ResolutionFold`

## Accessors

### abandonFold

#### Get Signature

```ts
get abandonFold(): AbandonFold;
```

Defined in: [packages/core/src/journal/resolution.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L261)

The AbandonFold projection consumed by the replay predicate.

##### Returns

[`AbandonFold`](/api/@rulvar/core/interfaces/AbandonFold.md)

## Methods

### classificationOf()

```ts
classificationOf(seq): 
  | RefEntryClassification
  | undefined;
```

Defined in: [packages/core/src/journal/resolution.ts:245](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L245)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `seq` | `number` |

#### Returns

  \| [`RefEntryClassification`](/api/@rulvar/core/type-aliases/RefEntryClassification.md)
  \| `undefined`

***

### invalidResolutions()

```ts
invalidResolutions(): {
  detail: string;
  seq: number;
}[];
```

Defined in: [packages/core/src/journal/resolution.ts:250](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L250)

Invalid offline resolutions surfaced in the resume report.

#### Returns

\{
  `detail`: `string`;
  `seq`: `number`;
\}[]

***

### openSuspensions()

```ts
openSuspensions(): JournalEntry[];
```

Defined in: [packages/core/src/journal/resolution.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L274)

Open suspended entries (for pending[] and re-arming at resume).

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### registerEntry()

```ts
registerEntry(entry): void;
```

Defined in: [packages/core/src/journal/resolution.ts:229](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L229)

Registers any other live-appended entry (abandon coverage needs scopes).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

`void`

***

### registerRefEntry()

```ts
registerRefEntry(entry): RefEntryClassification;
```

Defined in: [packages/core/src/journal/resolution.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L220)

Registers a live-appended ref-entry, returning its classification.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

[`RefEntryClassification`](/api/@rulvar/core/type-aliases/RefEntryClassification.md)

***

### registerSuspended()

```ts
registerSuspended(entry): void;
```

Defined in: [packages/core/src/journal/resolution.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L214)

Registers a live-appended suspended entry with the fold.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

#### Returns

`void`

***

### suspensionState()

```ts
suspensionState(target): SuspensionState;
```

Defined in: [packages/core/src/journal/resolution.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L233)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/core/type-aliases/SuspensionState.md)
