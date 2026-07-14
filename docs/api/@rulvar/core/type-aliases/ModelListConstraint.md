[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ModelListConstraint

# Type Alias: ModelListConstraint

```ts
type ModelListConstraint = {
  allow?: ModelRef[];
  deny?: ModelRef[];
};
```

Defined in: [packages/core/src/model/floors.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/floors.ts#L19)

An explicit allowlist and denylist; deny wins over allow.

## Properties

### allow?

```ts
optional allow?: ModelRef[];
```

Defined in: [packages/core/src/model/floors.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/floors.ts#L19)

***

### deny?

```ts
optional deny?: ModelRef[];
```

Defined in: [packages/core/src/model/floors.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/model/floors.ts#L19)
