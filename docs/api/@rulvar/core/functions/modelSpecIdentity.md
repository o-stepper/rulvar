[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / modelSpecIdentity

# Function: modelSpecIdentity()

```ts
function modelSpecIdentity(spec): 
  | {
  effort?: Effort;
  model: `${string}:${string}`;
}
  | {
  ladder: Json;
};
```

Defined in: [packages/core/src/journal/identity.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L90)

The identity projection of a CanonicalModelSpec. For the plain-model
kind the projection is `{ model, effort? }` WITHOUT the kind
discriminant, exactly as frozen by the hashVersion 2 profile;
`effort` is omitted when unresolved. The ladder embedding lands
with ladder execution (M7).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`CanonicalModelSpec`](/api/@rulvar/core/type-aliases/CanonicalModelSpec.md) |

## Returns

  \| \{
  `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md);
  `model`: `` `${string}:${string}` ``;
\}
  \| \{
  `ladder`: [`Json`](/api/@rulvar/core/type-aliases/Json.md);
\}
