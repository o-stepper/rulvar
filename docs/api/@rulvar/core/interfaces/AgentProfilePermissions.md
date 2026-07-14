[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfilePermissions

# Interface: AgentProfilePermissions

Defined in: [packages/core/src/runtime/permission-chain.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L68)

Profile-level permissions.
inheritPermissions governs SUBAGENT inheritance (mode c orchestrators,
M6+): children get their own config only unless explicitly opted in.
It is carried as data here and consumed by the spawning layers.

## Extends

- [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`ask`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-ask) | [packages/core/src/runtime/permission-chain.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L58) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`canUseTool`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-canusetool) | [packages/core/src/runtime/permission-chain.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L59) |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`deny`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-deny) | [packages/core/src/runtime/permission-chain.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L57) |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`hooks`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-hooks) | [packages/core/src/runtime/permission-chain.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L56) |
| <a id="property-inheritpermissions"></a> `inheritPermissions?` | `boolean` | Default false. | - | [packages/core/src/runtime/permission-chain.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L72) |
| <a id="property-preset"></a> `preset?` | `"strict"` \| `"standard"` \| `"open"` | Compiles into deny/ask rules; ships in M5. | - | [packages/core/src/runtime/permission-chain.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L70) |
