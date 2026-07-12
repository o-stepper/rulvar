[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / compilePermissionPreset

# Function: compilePermissionPreset()

```ts
function compilePermissionPreset(preset): {
  ask: PermissionRule[];
  deny: PermissionRule[];
};
```

Defined in: [packages/core/src/tools/presets.ts:31](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/presets.ts#L31)

## Parameters

| Parameter | Type |
| ------ | ------ |
| `preset` | [`PermissionPreset`](/api/@rulvar/core/type-aliases/PermissionPreset.md) |

## Returns

```ts
{
  ask: PermissionRule[];
  deny: PermissionRule[];
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `ask` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | [packages/core/src/tools/presets.ts:33](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/presets.ts#L33) |
| `deny` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | [packages/core/src/tools/presets.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/presets.ts#L32) |
