[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeAdapter

# Class: FakeAdapter

Defined in: [packages/testing/src/fake-adapter.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L109)

@rulvar/testing tier 1 (M1-T14): FakeAdapter and createTestEngine for
fast, fully typed, zero-network unit tests through the real engine.
Matchers live at '@rulvar/testing/matchers'. VCR cassettes and
replay-strict arrive with M5/M2.

## Implements

- [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)

## Constructors

### Constructor

```ts
new FakeAdapter(options): FakeAdapter;
```

Defined in: [packages/testing/src/fake-adapter.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L116)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`FakeAdapterOptions`](/api/@rulvar/testing/interfaces/FakeAdapterOptions.md) |

#### Returns

`FakeAdapter`

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-calls"></a> `calls` | `readonly` | [`FakeCall`](/api/@rulvar/testing/interfaces/FakeCall.md)[] | `[]` | Every request this adapter served, in order. | [packages/testing/src/fake-adapter.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L114) |
| <a id="property-id"></a> `id` | `readonly` | `"fake"` | `undefined` | Stable adapter id; the left segment of ModelRef. | [packages/testing/src/fake-adapter.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L110) |

## Methods

### caps()

```ts
caps(this): ModelCaps;
```

Defined in: [packages/testing/src/fake-adapter.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L120)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `this` | `void` |

#### Returns

[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)

#### Implementation of

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md).[`caps`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md#caps)

***

### stream()

```ts
stream(req): AsyncIterable<ChatEvent>;
```

Defined in: [packages/testing/src/fake-adapter.ts:145](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L145)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)\&gt;

#### Implementation of

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md).[`stream`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md#stream)
