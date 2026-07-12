[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Out

# Type Alias: Out\&lt;S\&gt;

```ts
type Out<S> = S extends StandardSchemaV1 ? InferOutput<S> : S extends {
  validate: (value) => value is infer T;
} ? T : unknown;
```

Defined in: `packages/core/dist/index.d.ts`

Inferred output type per form: the Standard Schema output type; the
type-guard target of validate(); unknown for a bare JSON Schema.

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
