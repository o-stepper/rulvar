[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / FakeAdapter

# Class: FakeAdapter

Defined in: [packages/testing/src/fake-adapter.ts:149](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L149)

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

Defined in: [packages/testing/src/fake-adapter.ts:159](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L159)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`FakeAdapterOptions`](/api/@rulvar/testing/interfaces/FakeAdapterOptions.md) |

#### Returns

`FakeAdapter`

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="property-calls"></a> `calls` | `readonly` | [`FakeCall`](/api/@rulvar/testing/interfaces/FakeCall.md)[] | `[]` | Every request this adapter served, in order. A request whose signal was already aborted on arrival was never served and is not recorded. | [packages/testing/src/fake-adapter.ts:157](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L157) |
| <a id="property-id"></a> `id` | `readonly` | `"fake"` | `undefined` | Stable adapter id; the left segment of ModelRef. | [packages/testing/src/fake-adapter.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L150) |

## Methods

### caps()

```ts
caps(this): ModelCaps;
```

Defined in: [packages/testing/src/fake-adapter.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L163)

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
stream(req, signal?): AsyncIterable<ChatEvent>;
```

Defined in: [packages/testing/src/fake-adapter.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/fake-adapter.ts#L188)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `signal?` | `AbortSignal` |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)\&gt;

#### Implementation of

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md).[`stream`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md#stream)
