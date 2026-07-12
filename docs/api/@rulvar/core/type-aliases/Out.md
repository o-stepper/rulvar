[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Out

# Type Alias: Out\&lt;S\&gt;

```ts
type Out<S> = S extends StandardSchemaV1 ? InferOutput<S> : S extends {
  validate: (value) => value is infer T;
} ? T : unknown;
```

Defined in: [packages/core/src/l0/schema.ts:35](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/schema.ts#L35)

Inferred output type per form: the Standard Schema output type; the
type-guard target of validate(); unknown for a bare JSON Schema
(docs/08, section "Out&lt;S&gt; inference").

## Type Parameters

| Type Parameter |
| ------ |
| `S` |
