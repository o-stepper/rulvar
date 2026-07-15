[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProviderAdapter

# Interface: ProviderAdapter

Defined in: [packages/core/src/l0/spi/provider.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L72)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | Stable adapter id; the left segment of ModelRef. | [packages/core/src/l0/spi/provider.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L74) |
| <a id="property-provider"></a> `provider?` | `string` | Provider family for provider-raw matching and retention (committed during M4-T02). Two adapters of the same family share retained blocks and projections; default = id. | [packages/core/src/l0/spi/provider.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L80) |

## Methods

### caps()

```ts
caps(model): ModelCaps;
```

Defined in: [packages/core/src/l0/spi/provider.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L81)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

#### Returns

[`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md)

***

### countTokens()?

```ts
optional countTokens(req): Promise<number>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L85)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### refreshCaps()?

```ts
optional refreshCaps(): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L83)

Refresh the capability table from live model lists.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### stream()

```ts
stream(req, signal?): AsyncIterable<ChatEvent>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L84)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |
| `signal?` | `AbortSignal` |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/core/type-aliases/ChatEvent.md)\&gt;
