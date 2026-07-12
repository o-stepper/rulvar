[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / modelSpecIdentity

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

Defined in: `packages/core/dist/index.d.ts`

The identity projection of a CanonicalModelSpec. For the plain-model
kind the projection is `{ model, effort? }` WITHOUT the kind
discriminant, exactly as frozen by the hashVersion 2 profile;
`effort` is omitted when unresolved. The ladder embedding lands
with ladder execution (M7).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `spec` | [`CanonicalModelSpec`](/api/@rulvar/rulvar/type-aliases/CanonicalModelSpec.md) |

## Returns

  \| \{
  `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md);
  `model`: `` `${string}:${string}` ``;
\}
  \| \{
  `ladder`: [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md);
\}
