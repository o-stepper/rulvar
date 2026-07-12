[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SchemaPair

# Type Alias: SchemaPair\&lt;T\&gt;

```ts
type SchemaPair<T> = {
  jsonSchema: JsonSchema;
  validate: (value) => value is T;
};
```

Defined in: [packages/core/src/l0/schema.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L18)

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

Defined in: [packages/core/src/l0/schema.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L19)

***

### validate

```ts
validate: (value) => value is T;
```

Defined in: [packages/core/src/l0/schema.ts:20](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L20)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |

#### Returns

`value is T`
