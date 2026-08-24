[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectReconciler

# Class: EffectReconciler

Defined in: [packages/effects/src/reconciler.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L51)

## Constructors

### Constructor

```ts
new EffectReconciler(options): EffectReconciler;
```

Defined in: [packages/effects/src/reconciler.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L56)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`EffectReconcilerOptions`](/api/@rulvar/effects/interfaces/EffectReconcilerOptions.md) |

#### Returns

`EffectReconciler`

## Methods

### reconcileRestoration()

```ts
reconcileRestoration(options?): Promise<RestorationReport>;
```

Defined in: [packages/effects/src/reconciler.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L230)

The post-restore reconciliation (RFC section 4.5, item 3; kill
25). Requires the current epoch to be a restoration epoch awaiting
release. With `enumerate`, every provider effect whose logical key
has no consumed intent anywhere in the journal quarantines
standalone by name (what could NOT be reconstructed), and open
machines re-enter recovery through the ordinary sweep. Without
authoritative enumeration the whole affected range quarantines as
one named record and automatic recovery is forbidden. Either way
the sweep runs, the completion decision appends, and attempt
dispatch re-enables for the epoch.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options?` | \{ `enumerate?`: () => `Promise`\&lt;\{ `logicalKey`: `string`; `receipt?`: [`EffectReceiptObservation`](/api/@rulvar/effects/interfaces/EffectReceiptObservation.md); \}[]\&gt;; \} |
| `options.enumerate?` | () => `Promise`\&lt;\{ `logicalKey`: `string`; `receipt?`: [`EffectReceiptObservation`](/api/@rulvar/effects/interfaces/EffectReceiptObservation.md); \}[]\&gt; |

#### Returns

`Promise`\&lt;[`RestorationReport`](/api/@rulvar/effects/interfaces/RestorationReport.md)\&gt;

***

### sweep()

```ts
sweep(options?): Promise<EffectSweepReport>;
```

Defined in: [packages/effects/src/reconciler.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/reconciler.ts#L166)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `recover?`: `boolean`; \} |
| `options.recover?` | `boolean` |

#### Returns

`Promise`\&lt;[`EffectSweepReport`](/api/@rulvar/effects/interfaces/EffectSweepReport.md)\&gt;
