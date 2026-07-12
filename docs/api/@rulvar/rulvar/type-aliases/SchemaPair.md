[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SchemaPair

# Type Alias: SchemaPair\&lt;T\&gt;

```ts
type SchemaPair<T> = {
  jsonSchema: JsonSchema;
  validate: (value) => value is T;
};
```

Defined in: `packages/core/dist/index.d.ts`

Form 2 of SchemaSpec: an explicit JSON Schema plus a runtime type guard.

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | `unknown` |

## Properties

### jsonSchema

```ts
jsonSchema: JsonSchema;
```

Defined in: `packages/core/dist/index.d.ts`

***

### validate

```ts
validate: (value) => value is T;
```

Defined in: `packages/core/dist/index.d.ts`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`value is T`
