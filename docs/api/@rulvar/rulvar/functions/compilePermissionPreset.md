[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / compilePermissionPreset

# Function: compilePermissionPreset()

```ts
function compilePermissionPreset(preset): {
  ask: PermissionRule[];
  deny: PermissionRule[];
};
```

Defined in: `packages/core/dist/index.d.ts`

## Parameters

| Parameter | Type |
| ------ | ------ |
| `preset` | [`PermissionPreset`](/api/@rulvar/rulvar/type-aliases/PermissionPreset.md) |

## Returns

```ts
{
  ask: PermissionRule[];
  deny: PermissionRule[];
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `ask` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | `packages/core/dist/index.d.ts` |
| `deny` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | `packages/core/dist/index.d.ts` |
