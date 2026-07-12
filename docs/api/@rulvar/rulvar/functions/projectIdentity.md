[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / projectIdentity

# Function: projectIdentity()

```ts
function projectIdentity(input): Record<string, unknown>;
```

Defined in: `packages/core/dist/index.d.ts`

The canonical identity object of an IdentityInput under the hashVersion
2 profile: what JCS serializes and sha256 hashes. The agent kind
projects modelSpec through modelSpecIdentity; every other kind
serializes its fields verbatim. Fields not listed for a kind are never
included (the types make them unrepresentable).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/rulvar/type-aliases/IdentityInput.md) |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
