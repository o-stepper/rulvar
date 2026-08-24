[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/effects](/api/@rulvar/effects/index.md) / FakeEffectProvider

# Class: FakeEffectProvider

Defined in: [packages/effects/src/fakes.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L58)

## Implements

- [`EffectAdapter`](/api/@rulvar/effects/interfaces/EffectAdapter.md)

## Constructors

### Constructor

```ts
new FakeEffectProvider(descriptor): FakeEffectProvider;
```

Defined in: [packages/effects/src/fakes.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L77)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `descriptor` | [`EffectProviderDescriptor`](/api/@rulvar/effects/interfaces/EffectProviderDescriptor.md) |

#### Returns

`FakeEffectProvider`

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-descriptor"></a> `descriptor` | `readonly` | [`EffectProviderDescriptor`](/api/@rulvar/effects/interfaces/EffectProviderDescriptor.md) | `undefined` | - | [packages/effects/src/fakes.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L59) |
| <a id="property-dispatches"></a> `dispatches` | `public` | `number` | `0` | Provider contacts, the kill point 7 counter. | [packages/effects/src/fakes.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L66) |
| <a id="property-latefenced"></a> `lateFenced` | `public` | `number` | `0` | Late sends the provider's own fencing refused or deduped. | [packages/effects/src/fakes.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L71) |
| <a id="property-latelandings"></a> `lateLandings` | `public` | `number` | `0` | Late sends that landed as provider effects (the 'neither' hazard). | [packages/effects/src/fakes.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L69) |
| <a id="property-lookups"></a> `lookups` | `public` | `number` | `0` | - | [packages/effects/src/fakes.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L67) |
| <a id="property-nextbehavior"></a> `nextBehavior` | `public` | [`FakeDispatchBehavior`](/api/@rulvar/effects/type-aliases/FakeDispatchBehavior.md) | `'commit'` | - | [packages/effects/src/fakes.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L72) |
| <a id="property-stallnextsend"></a> `stallNextSend` | `public` | `boolean` | `false` | Capture the next send in flight instead of executing it. | [packages/effects/src/fakes.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L74) |

## Methods

### closeAcceptance()

```ts
closeAcceptance(request): Promise<EffectLookupAnswer>;
```

Defined in: [packages/effects/src/fakes.ts:232](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L232)

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

#### Implementation of

[`EffectAdapter`](/api/@rulvar/effects/interfaces/EffectAdapter.md).[`closeAcceptance`](/api/@rulvar/effects/interfaces/EffectAdapter.md#closeacceptance)

***

### dispatch()

```ts
dispatch(request): Promise<EffectDispatchResult>;
```

Defined in: [packages/effects/src/fakes.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L130)

Sends one attempt. Called ONLY by the dispatcher, ONLY with the
seq of an attempt record it just appended.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`EffectDispatchRequest`](/api/@rulvar/effects/interfaces/EffectDispatchRequest.md) |

#### Returns

`Promise`\&lt;[`EffectDispatchResult`](/api/@rulvar/effects/type-aliases/EffectDispatchResult.md)\&gt;

#### Implementation of

[`EffectAdapter`](/api/@rulvar/effects/interfaces/EffectAdapter.md).[`dispatch`](/api/@rulvar/effects/interfaces/EffectAdapter.md#dispatch)

***

### effectCount()

```ts
effectCount(logicalKey): number;
```

Defined in: [packages/effects/src/fakes.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L82)

How many committed effects exist for one logical key.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `logicalKey` | `string` |

#### Returns

`number`

***

### lookup()

```ts
lookup(request): Promise<EffectLookupAnswer>;
```

Defined in: [packages/effects/src/fakes.ts:221](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L221)

Queries the provider for the effect's truth, when the row offers it.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `request` | [`EffectLookupRequest`](/api/@rulvar/effects/interfaces/EffectLookupRequest.md) |

#### Returns

`Promise`\&lt;[`EffectLookupAnswer`](/api/@rulvar/effects/type-aliases/EffectLookupAnswer.md)\&gt;

#### Implementation of

[`EffectAdapter`](/api/@rulvar/effects/interfaces/EffectAdapter.md).[`lookup`](/api/@rulvar/effects/interfaces/EffectAdapter.md#lookup)

***

### releaseStalled()

```ts
releaseStalled(): void;
```

Defined in: [packages/effects/src/fakes.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/effects/src/fakes.ts#L199)

Releases every stalled send NOW, long after capture: the stale
sender transmitting after any amount of waiting. The provider's
own fencing decides what the late bytes do, exactly as in
production: a dedup key dedupes, a closed acceptance refuses the
specific attempt, a unique natural key refuses the duplicate, and
a 'neither' provider lets the late effect LAND.

#### Returns

`void`
