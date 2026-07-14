[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / AgentProfilePermissions

# Interface: AgentProfilePermissions

Defined in: `packages/core/dist/index.d.ts`

Profile-level permissions.
inheritPermissions governs SUBAGENT inheritance (mode c orchestrators,
M6+): children get their own config only unless explicitly opted in.
It is carried as data here and consumed by the spawning layers.

## Extends

- [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md).[`ask`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md#property-ask) | `packages/core/dist/index.d.ts` |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/rulvar/type-aliases/CanUseTool.md) | - | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md).[`canUseTool`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md#property-canusetool) | `packages/core/dist/index.d.ts` |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md).[`deny`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md#property-deny) | `packages/core/dist/index.d.ts` |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/rulvar/type-aliases/PermissionHook.md)[] | - | [`PermissionConfig`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md).[`hooks`](/api/@rulvar/rulvar/interfaces/PermissionConfig.md#property-hooks) | `packages/core/dist/index.d.ts` |
| <a id="property-inheritpermissions"></a> `inheritPermissions?` | `boolean` | Default false. | - | `packages/core/dist/index.d.ts` |
| <a id="property-preset"></a> `preset?` | `"strict"` \| `"standard"` \| `"open"` | Compiles into deny/ask rules; ships in M5. | - | `packages/core/dist/index.d.ts` |
