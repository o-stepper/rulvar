[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpanRegistry

# Class: SpanRegistry

Defined in: [packages/core/src/engine/events.ts:30](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L30)

Spans form a tree per run; spanId values are engine-minted opaque
strings, unique per run, pure telemetry, never identity.

## Constructors

### Constructor

```ts
new SpanRegistry(options?): SpanRegistry;
```

Defined in: [packages/core/src/engine/events.ts:34](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L34)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | \{ `first?`: `number`; \} | - |
| `options.first?` | `number` | First counter value (default 0): the resumed-segment base that keeps span ids unique per run across segments. |

#### Returns

`SpanRegistry`

## Methods

### mint()

```ts
mint(parentSpanId?): string;
```

Defined in: [packages/core/src/engine/events.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `parentSpanId?` | `string` |

#### Returns

`string`

***

### parentOf()

```ts
parentOf(spanId): string | undefined;
```

Defined in: [packages/core/src/engine/events.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L52)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |

#### Returns

`string` \| `undefined`
