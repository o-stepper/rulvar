[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / projectIdentity

# Function: projectIdentity()

```ts
function projectIdentity(input): Record<string, unknown>;
```

Defined in: [packages/core/src/journal/identity.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L108)

The canonical identity object of an IdentityInput under the hashVersion
2 profile: what JCS serializes and sha256 hashes. The agent kind
projects modelSpec through modelSpecIdentity; every other kind
serializes its fields verbatim. Fields not listed for a kind are never
included (the types make them unrepresentable).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `input` | [`IdentityInput`](/api/@rulvar/core/type-aliases/IdentityInput.md) |

## Returns

`Record`\&lt;`string`, `unknown`\&gt;
