[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CompiledPermissionChain

# Interface: CompiledPermissionChain

Defined in: [packages/core/src/runtime/permission-chain.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L90)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | The merged opt-in approval deadline; profile over engine (RV1107). | [packages/core/src/runtime/permission-chain.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L96) |
| <a id="property-ask"></a> `ask` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L93) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [packages/core/src/runtime/permission-chain.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L94) |
| <a id="property-deny"></a> `deny` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L92) |
| <a id="property-hooks"></a> `hooks` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [packages/core/src/runtime/permission-chain.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L91) |
