[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ProviderAdapter

# Interface: ProviderAdapter

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | Stable adapter id; the left segment of ModelRef. | `packages/core/dist/index.d.ts` |
| <a id="property-provider"></a> `provider?` | `string` | Provider family for provider-raw matching and retention (committed during M4-T02). Two adapters of the same family share retained blocks and projections; default = id. | `packages/core/dist/index.d.ts` |

## Methods

### caps()

```ts
caps(model): ModelCaps;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

#### Returns

[`ModelCaps`](/api/@rulvar/rulvar/type-aliases/ModelCaps.md)

***

### countTokens()?

```ts
optional countTokens(req): Promise<number>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### refreshCaps()?

```ts
optional refreshCaps(): Promise<void>;
```

Defined in: `packages/core/dist/index.d.ts`

Refresh the capability table from live model lists.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### stream()

```ts
stream(req, signal?): AsyncIterable<ChatEvent>;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `signal?` | `AbortSignal` |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/rulvar/type-aliases/ChatEvent.md)\&gt;
