[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SpanRegistry

# Class: SpanRegistry

Defined in: [packages/core/src/engine/events.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L17)

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

Defined in: [packages/core/src/engine/events.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L21)

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

Defined in: [packages/core/src/engine/events.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/events.ts#L29)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `spanId` | `string` |

#### Returns

`string` \| `undefined`
