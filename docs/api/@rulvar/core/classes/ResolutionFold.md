[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionFold

# Class: ResolutionFold

Defined in: [packages/core/src/journal/resolution.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L79)

The first-closing-wins fold over a loaded journal: one pass by seq,
bit-identical on every store returning the same entries. Resolution
values are validated at consumption against the schema pinned INSIDE
the suspended entry payload (canonical bare JSON Schema); a
schema-invalid offline resolution classifies invalid and does NOT close
the target. Abandon coverage is the target seq plus the transitive
child scope-prefix; the AbandonFold consumed by the replay predicate is
a projection of THIS fold (docs/03, section 6.2: not a separate pass).

## Constructors

### Constructor

```ts
new ResolutionFold(entries): ResolutionFold;
```

Defined in: [packages/core/src/journal/resolution.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L86)

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

Defined in: [packages/core/src/journal/resolution.ts:249](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L249)

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

Defined in: [packages/core/src/journal/resolution.ts:233](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L233)

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

Defined in: [packages/core/src/journal/resolution.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L238)

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

Defined in: [packages/core/src/journal/resolution.ts:262](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L262)

Open suspended entries (for pending[] and re-arming at resume).

#### Returns

[`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md)[]

***

### registerEntry()

```ts
registerEntry(entry): void;
```

Defined in: [packages/core/src/journal/resolution.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L217)

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

Defined in: [packages/core/src/journal/resolution.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L208)

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

Defined in: [packages/core/src/journal/resolution.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L202)

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

Defined in: [packages/core/src/journal/resolution.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L221)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `target` | `number` |

#### Returns

[`SuspensionState`](/api/@rulvar/core/type-aliases/SuspensionState.md)
