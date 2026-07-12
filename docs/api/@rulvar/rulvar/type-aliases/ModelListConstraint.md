[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ModelListConstraint

# Type Alias: ModelListConstraint

```ts
type ModelListConstraint = {
  allow?: ModelRef[];
  deny?: ModelRef[];
};
```

Defined in: `packages/core/dist/index.d.ts`

An explicit allowlist and denylist; deny wins over allow.

## Properties

### allow?

```ts
optional allow?: ModelRef[];
```

Defined in: `packages/core/dist/index.d.ts`

***

### deny?

```ts
optional deny?: ModelRef[];
```

Defined in: `packages/core/dist/index.d.ts`
