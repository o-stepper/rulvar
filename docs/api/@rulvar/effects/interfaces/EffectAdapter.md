[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / EffectAdapter

# Interface: EffectAdapter

Defined in: [packages/effects/src/adapter.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L89)

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-descriptor"></a> `descriptor` | `readonly` | [`EffectProviderDescriptor`](/api/@rulvar/effects/interfaces/EffectProviderDescriptor.md) | [packages/effects/src/adapter.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L90) |

## Methods

### closeAcceptance()?

```ts
optional closeAcceptance(request): Promise<EffectLookupAnswer>;
```

Defined in: [packages/effects/src/adapter.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L104)

The acceptance-closing primitive (query then cancel): after this
resolves with `found: false`, late bytes for this effect are
unacceptable at the provider, which is the ONLY thing that makes
a negative answer final (RFC section 4.4).

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`EffectLookupRequest`](/api/@rulvar/effects/interfaces/EffectLookupRequest.md) |

#### Returns

`Promise`\&lt;[`EffectLookupAnswer`](/api/@rulvar/effects/type-aliases/EffectLookupAnswer.md)\&gt;

***

### dispatch()

```ts
dispatch(request): Promise<EffectDispatchResult>;
```

Defined in: [packages/effects/src/adapter.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L95)

Sends one attempt. Called ONLY by the dispatcher, ONLY with the
seq of an attempt record it just appended.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`EffectDispatchRequest`](/api/@rulvar/effects/interfaces/EffectDispatchRequest.md) |

#### Returns

`Promise`\&lt;[`EffectDispatchResult`](/api/@rulvar/effects/type-aliases/EffectDispatchResult.md)\&gt;

***

### lookup()?

```ts
optional lookup(request): Promise<EffectLookupAnswer>;
```

Defined in: [packages/effects/src/adapter.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/adapter.ts#L97)

Queries the provider for the effect's truth, when the row offers it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`EffectLookupRequest`](/api/@rulvar/effects/interfaces/EffectLookupRequest.md) |

#### Returns

`Promise`\&lt;[`EffectLookupAnswer`](/api/@rulvar/effects/type-aliases/EffectLookupAnswer.md)\&gt;
