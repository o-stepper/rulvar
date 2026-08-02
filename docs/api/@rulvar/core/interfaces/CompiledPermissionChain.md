[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CompiledPermissionChain

# Interface: CompiledPermissionChain

Defined in: [packages/core/src/runtime/permission-chain.ts:108](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L108)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | The merged opt-in approval deadline; profile over engine (RV1107). | [packages/core/src/runtime/permission-chain.ts:116](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L116) |
| <a id="property-ask"></a> `ask` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:111](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L111) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [packages/core/src/runtime/permission-chain.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L112) |
| <a id="property-deny"></a> `deny` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:110](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L110) |
| <a id="property-hooks"></a> `hooks` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [packages/core/src/runtime/permission-chain.ts:109](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L109) |
| <a id="property-strictapprovals"></a> `strictApprovals?` | `boolean` | The monotonic OR of both layers' strictApprovals (RV1507). | [packages/core/src/runtime/permission-chain.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L114) |
