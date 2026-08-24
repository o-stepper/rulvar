[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectDispatcher

# Class: EffectDispatcher

Defined in: [packages/effects/src/dispatcher.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L74)

## Constructors

### Constructor

```ts
new EffectDispatcher(options): EffectDispatcher;
```

Defined in: [packages/effects/src/dispatcher.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L82)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectDispatcherOptions`](/api/@rulvar/effects/interfaces/EffectDispatcherOptions.md) |

#### Returns

`EffectDispatcher`

## Methods

### dispatch()

```ts
dispatch(intentSeq): Promise<EffectDispatchReport>;
```

Defined in: [packages/effects/src/dispatcher.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L112)

The normal path: open the attempt (the writer's pre-attempt
re-fold cancels or refuses per RFC section 4.7), send through the
seam, classify the outcome, and confirm on a verified receipt.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |

#### Returns

`Promise`\&lt;[`EffectDispatchReport`](/api/@rulvar/effects/type-aliases/EffectDispatchReport.md)\&gt;

***

### recover()

```ts
recover(intentSeq): Promise<EffectRecoveryReport>;
```

Defined in: [packages/effects/src/dispatcher.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/dispatcher.ts#L263)

The crash-window recovery (RFC section 8): derived from what the
journal proves and what the capability row licenses. Never a blind
retry; never a provider contact on an already-closed machine.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `intentSeq` | `number` |

#### Returns

`Promise`\&lt;[`EffectRecoveryReport`](/api/@rulvar/effects/type-aliases/EffectRecoveryReport.md)\&gt;
