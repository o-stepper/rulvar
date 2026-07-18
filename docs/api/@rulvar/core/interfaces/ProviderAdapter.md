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
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | Declares WHICH reading of the provider's usage telemetry this adapter normalizes under; the engine stamps it on usage-bearing terminal entries so a journal records not only the numbers but the semantics they were produced under (v1.20.0 review P1/P2-2). Bump the string whenever the MEANING of a reported Usage field changes, even when no pricing rate moves; a rate change is a PriceTable pricingVersion bump instead. Entries persisted before this shipped carry no stamp, which is itself information: an unstamped OpenAI entry with cache writes may predate the v1.20.0 cache-subset correction. Optional; adapters that never changed semantics can omit it. | [packages/core/src/l0/spi/provider.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L94) |

## Methods

### caps()

```ts
caps(model): ModelCaps;
```

Defined in: [packages/core/src/l0/spi/provider.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L95)

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

Defined in: [packages/core/src/l0/spi/provider.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L99)

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

Defined in: [packages/core/src/l0/spi/provider.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L97)

Refresh the capability table from live model lists.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### stream()

```ts
stream(req, signal?): AsyncIterable<ChatEvent>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L98)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |
| `signal?` | `AbortSignal` |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/core/type-aliases/ChatEvent.md)\&gt;
