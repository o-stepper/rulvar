[**rulvar API reference**](../../../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / [StandardJSONSchemaV1](/api/@rulvar/rulvar/namespaces/StandardJSONSchemaV1/index.md) / Target

# Type Alias: Target

```ts
type Target = 
  | "draft-2020-12"
  | "draft-07"
  | "openapi-3.0"
  | {
} & string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The target version of the generated JSON Schema.

It is *strongly recommended* that implementers support `"draft-2020-12"` and `"draft-07"`, as they are both in wide use. All other targets can be implemented on a best-effort basis. Libraries should throw if they don't support a specified target.

The `"openapi-3.0"` target is intended as a standardized specifier for OpenAPI 3.0 which is a superset of JSON Schema `"draft-04"`.
