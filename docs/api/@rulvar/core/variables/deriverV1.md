[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / deriverV1

# Variable: deriverV1

```ts
const deriverV1: KeyDeriver;
```

Defined in: [packages/core/src/journal/keyderiver.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/keyderiver.ts#L107)

The frozen v1 (round 1) profile: the projection removes effort from the
requested modelSpec (the v1 predicate is effort-insensitive by
construction); features outside the v1 domain are incomparable.
