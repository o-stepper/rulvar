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
new SpanRegistry(): SpanRegistry;
```

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
