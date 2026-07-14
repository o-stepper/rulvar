[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionFold

# Class: ResolutionFold

Defined in: [packages/core/src/journal/resolution.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L78)

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

Defined in: [packages/core/src/journal/resolution.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L85)

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

Defined in: [packages/core/src/journal/resolution.ts:248](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L248)

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

Defined in: [packages/core/src/journal/resolution.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L232)

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

Defined in: [packages/core/src/journal/resolution.ts:237](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L237)

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

Defined in: [packages/core/src/journal/resolution.ts:261](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L261)

Open suspended entries (for pending[] and re-arming at resume).

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### registerEntry()

```ts
registerEntry(entry): void;
```

Defined in: [packages/core/src/journal/resolution.ts:216](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L216)

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

Defined in: [packages/core/src/journal/resolution.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L207)

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

Defined in: [packages/core/src/journal/resolution.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L201)

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

Defined in: [packages/core/src/journal/resolution.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L220)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/core/type-aliases/SuspensionState.md)
