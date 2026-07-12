[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionConfig

# Interface: PermissionConfig

Defined in: [packages/core/src/runtime/permission-chain.ts:55](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L55)

Host-side permission configuration (engine defaults.permissions).

## Extended by

- [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md)

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | [packages/core/src/runtime/permission-chain.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L58) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | [packages/core/src/runtime/permission-chain.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L59) |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | [packages/core/src/runtime/permission-chain.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L57) |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | [packages/core/src/runtime/permission-chain.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L56) |
