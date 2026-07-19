[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SpanRegistry

# Class: SpanRegistry

Defined in: `packages/core/dist/index.d.ts`

Spans form a tree per run; spanId values are engine-minted opaque
strings, unique per run, pure telemetry, never identity.

## Constructors

### Constructor

```ts
new SpanRegistry(options?): SpanRegistry;
```

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

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

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |

#### Returns

`string` \| `undefined`
