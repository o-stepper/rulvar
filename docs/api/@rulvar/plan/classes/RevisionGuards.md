[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / RevisionGuards

# Class: RevisionGuards

Defined in: [packages/plan/src/guards.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L112)

The guard state machine. All counting inputs arrive from pure folds
(the caller feeds landed revisions, severs, and re-adds in journal
order), so live and replay converge on identical verdicts; the caller
journals each verdict BEFORE applying its effects.

## Constructors

### Constructor

```ts
new RevisionGuards(options?): RevisionGuards;
```

Defined in: [packages/plan/src/guards.ts:125](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L125)

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

Defined in: [packages/plan/src/guards.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L162)

True once a terminating fallback engaged: the plan is frozen for adaptation.

##### Returns

`boolean`

***

### revisionsRejected

#### Get Signature

```ts
get revisionsRejected(): boolean;
```

Defined in: [packages/plan/src/guards.ts:167](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L167)

True when further plan_revise calls are rejected outright.

##### Returns

`boolean`

***

### stallReplanExhausted

#### Get Signature

```ts
get stallReplanExhausted(): boolean;
```

Defined in: [packages/plan/src/guards.ts:247](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L247)

##### Returns

`boolean`

***

### state

#### Get Signature

```ts
get state(): GuardsState;
```

Defined in: [packages/plan/src/guards.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L153)

##### Returns

[`GuardsState`](/api/@rulvar/plan/interfaces/GuardsState.md)

## Methods

### absorbVerdict()

```ts
absorbVerdict(value): void;
```

Defined in: [packages/plan/src/guards.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L252)

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

Defined in: [packages/plan/src/guards.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L222)

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

Defined in: [packages/plan/src/guards.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L201)

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

Defined in: [packages/plan/src/guards.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L175)

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

Defined in: [packages/plan/src/guards.ts:189](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L189)

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

Defined in: [packages/plan/src/guards.ts:234](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L234)

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

Defined in: [packages/plan/src/guards.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L226)

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

Defined in: [packages/plan/src/guards.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/guards.ts#L268)

Serializes a verdict for the journal append.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | [`GuardVerdictValue`](/api/@rulvar/plan/interfaces/GuardVerdictValue.md) |

#### Returns

[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)
