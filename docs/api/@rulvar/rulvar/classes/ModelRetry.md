[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelRetry

# Class: ModelRetry

Defined in: `packages/core/dist/index.d.ts`

## Extends

- `Error`

## Constructors

### Constructor

```ts
new ModelRetry(message, opts?): ModelRetry;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `opts?` | \{ `data?`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md); \} |
| `opts.data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) |

#### Returns

`ModelRetry`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | `readonly` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
