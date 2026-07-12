[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpanRegistry

# Class: SpanRegistry

Defined in: [packages/core/src/engine/events.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L19)

Spans form a tree per run; spanId values are engine-minted opaque
strings, unique per run, pure telemetry, never identity (docs/09,
section "Span hierarchy").

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

Defined in: [packages/core/src/engine/events.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L23)

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

Defined in: [packages/core/src/engine/events.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L31)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |

#### Returns

`string` \| `undefined`
