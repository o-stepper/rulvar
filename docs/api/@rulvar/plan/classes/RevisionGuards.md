[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RevisionGuards

# Class: RevisionGuards

Defined in: [packages/plan/src/guards.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L103)

The guard state machine. All counting inputs arrive from pure folds
(the caller feeds landed revisions, severs, and re-adds in journal
order), so live and replay converge on identical verdicts; the caller
journals each verdict BEFORE applying its effects.

## Constructors

### Constructor

```ts
new RevisionGuards(options?): RevisionGuards;
```

Defined in: [packages/plan/src/guards.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L116)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | [`RevisionGuardsOptions`](/api/@rulvar/plan/interfaces/RevisionGuardsOptions.md) & \{ `maxOscillationsPerKey?`: `number`; `stallReplanCap?`: `number`; \} |

#### Returns

`RevisionGuards`

## Accessors

### planFrozen

#### Get Signature

```ts
get planFrozen(): boolean;
```

Defined in: [packages/plan/src/guards.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L153)

True once a terminating fallback engaged: the plan is frozen for adaptation.

##### Returns

`boolean`

***

### revisionsRejected

#### Get Signature

```ts
get revisionsRejected(): boolean;
```

Defined in: [packages/plan/src/guards.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L158)

True when further plan_revise calls are rejected outright.

##### Returns

`boolean`

***

### stallReplanExhausted

#### Get Signature

```ts
get stallReplanExhausted(): boolean;
```

Defined in: [packages/plan/src/guards.ts:238](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L238)

##### Returns

`boolean`

***

### state

#### Get Signature

```ts
get state(): GuardsState;
```

Defined in: [packages/plan/src/guards.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L144)

##### Returns

[`GuardsState`](/api/@rulvar/plan/interfaces/GuardsState.md)

## Methods

### absorbVerdict()

```ts
absorbVerdict(value): void;
```

Defined in: [packages/plan/src/guards.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L243)

Rebuilds guard state from a journaled verdict (replay path).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md) |

#### Returns

`void`

***

### isFrozenSignature()

```ts
isFrozenSignature(approachSigCoarse): boolean;
```

Defined in: [packages/plan/src/guards.ts:213](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L213)

True when further re-adds of this coarse signature are frozen.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `approachSigCoarse` | `string` |

#### Returns

`boolean`

***

### onReAdd()

```ts
onReAdd(approachSigCoarse): 
  | GuardVerdictValue
  | undefined;
```

Defined in: [packages/plan/src/guards.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L192)

Feeds one admitted add of this coarse signature; a re-add after a
sever counts one oscillation ACROSS LTID boundaries. Returns the
freeze verdict to journal when the per-key limit is reached.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `approachSigCoarse` | `string` |

#### Returns

  \| [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md)
  \| `undefined`

***

### onRevisionLanded()

```ts
onRevisionLanded(effectiveDroppedStreak): 
  | GuardVerdictValue
  | undefined;
```

Defined in: [packages/plan/src/guards.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L166)

Feeds one landed revision's effective streak; returns the verdict to
journal when the limit is reached (single-shot).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `effectiveDroppedStreak` | `number` |

#### Returns

  \| [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md)
  \| `undefined`

***

### onSevered()

```ts
onSevered(approachSigCoarse): void;
```

Defined in: [packages/plan/src/guards.ts:180](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L180)

Feeds a severing cancel/abandon of a node with this coarse signature.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `approachSigCoarse` | `string` |

#### Returns

`void`

***

### onStallReplan()

```ts
onStallReplan(): 
  | GuardVerdictValue
  | undefined;
```

Defined in: [packages/plan/src/guards.ts:225](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L225)

Consumes one stall-triggered replan slot; returns the cap verdict
when the hard per-run bound is exhausted (single-shot per call site).

#### Returns

  \| [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md)
  \| `undefined`

***

### oscillationCountOf()

```ts
oscillationCountOf(approachSigCoarse): number;
```

Defined in: [packages/plan/src/guards.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L217)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `approachSigCoarse` | `string` |

#### Returns

`number`

***

### verdictJson()

```ts
static verdictJson(value): Json;
```

Defined in: [packages/plan/src/guards.ts:259](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L259)

Serializes a verdict for the journal append.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md) |

#### Returns

[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)
