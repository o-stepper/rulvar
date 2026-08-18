[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ProviderAdapter

# Interface: ProviderAdapter

Defined in: [packages/core/src/l0/spi/provider.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L128)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-id"></a> `id` | `string` | Stable adapter id; the left segment of ModelRef. | [packages/core/src/l0/spi/provider.ts:130](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L130) |
| <a id="property-provider"></a> `provider?` | `string` | Provider family for provider-raw matching and retention (committed during M4-T02). Two adapters of the same family share retained blocks and projections; default = id. | [packages/core/src/l0/spi/provider.ts:136](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L136) |
| <a id="property-scopekey"></a> `scopeKey?` | `string` | The account identity of this adapter within its provider family (RV4007): two adapters of one family serving different provider accounts declare different scopeKeys, and the retention transport then keys provider-raw blocks by (family, scopeKey) instead of family alone, so cache handles and thinking blocks minted under one account never ride a request served by another. Undeclared keeps the family-wide sharing byte for byte. Attribution and projection identity only: routing, pricing, and quota keys are untouched. | [packages/core/src/l0/spi/provider.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L148) |
| <a id="property-usagesemantics"></a> `usageSemantics?` | `string` | Declares WHICH reading of the provider's usage telemetry this adapter normalizes under; the engine stamps it on usage-bearing terminal entries so a journal records not only the numbers but the semantics they were produced under (v1.20.0 review P1/P2-2). Bump the string whenever the MEANING of a reported Usage field changes, even when no pricing rate moves; a rate change is a PriceTable pricingVersion bump instead. Entries persisted before this shipped carry no stamp, which is itself information: an unstamped OpenAI entry with cache writes may predate the v1.20.0 cache-subset correction. Optional; adapters that never changed semantics can omit it. | [packages/core/src/l0/spi/provider.ts:162](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L162) |

## Methods

### caps()

```ts
caps(model): ModelCaps;
```

Defined in: [packages/core/src/l0/spi/provider.ts:163](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L163)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `string` |

#### Returns

[`ModelCaps`](/api/@rulvar/core/type-aliases/ModelCaps.md)

***

### countTokens()?

```ts
optional countTokens(req, opts?): Promise<number>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:179](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L179)

Provider-side token count for the request, used to tighten the
admission reserve before a spawn dispatches. The request carries
the FULL prompt, so an implementation that goes over the network is
egress exactly like stream and MUST honor `opts.signal` (RV904):
the engine only calls this after a zero-egress admission
feasibility check, passes the spawn's abort signal, and treats an
abort as cancellation rather than falling back to the flat
reserve. Hosts that must not send prompts before their own
admission gates pass an explicit `estCost` instead, which skips
this call entirely.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |
| `opts?` | \{ `signal?`: `AbortSignal`; \} |
| `opts.signal?` | `AbortSignal` |

#### Returns

`Promise`\&lt;`number`\&gt;

***

### refreshCaps()?

```ts
optional refreshCaps(): Promise<void>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:165](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L165)

Refresh the capability table from live model lists.

#### Returns

`Promise`\&lt;`void`\&gt;

***

### stream()

```ts
stream(
   req, 
   signal?, 
hooks?): AsyncIterable<ChatEvent>;
```

Defined in: [packages/core/src/l0/spi/provider.ts:166](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/provider.ts#L166)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |
| `signal?` | `AbortSignal` |
| `hooks?` | [`StreamHooks`](/api/@rulvar/core/interfaces/StreamHooks.md) |

#### Returns

`AsyncIterable`\&lt;[`ChatEvent`](/api/@rulvar/core/type-aliases/ChatEvent.md)\&gt;
