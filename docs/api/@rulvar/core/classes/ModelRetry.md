[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelRetry

# Class: ModelRetry

Defined in: [packages/core/src/runtime/model-retry.ts:14](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/model-retry.ts#L14)

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ModelRetry(message, opts?): ModelRetry;
```

Defined in: [packages/core/src/runtime/model-retry.ts:17](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/model-retry.ts#L17)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `data?`: [`Json`](/api/@rulvar/core/type-aliases/Json.md); \} |
| `opts.data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) |

#### Returns

`ModelRetry`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/model-retry.ts:15](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/model-retry.ts#L15) |
