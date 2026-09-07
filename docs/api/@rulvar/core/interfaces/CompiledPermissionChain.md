[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CompiledPermissionChain

# Interface: CompiledPermissionChain

Defined in: [packages/core/src/runtime/permission-chain.ts:140](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L140)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | The merged opt-in approval deadline; profile over inherited over engine (RV1107). | [packages/core/src/runtime/permission-chain.ts:148](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L148) |
| <a id="property-ask"></a> `ask` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L143) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [packages/core/src/runtime/permission-chain.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L144) |
| <a id="property-deny"></a> `deny` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L142) |
| <a id="property-hookallow"></a> `hookAllow?` | `"advisory"` | Present exactly when a layer armed the advisory hook allow (RV4911). | [packages/core/src/runtime/permission-chain.ts:150](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L150) |
| <a id="property-hooks"></a> `hooks` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [packages/core/src/runtime/permission-chain.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L141) |
| <a id="property-strictapprovals"></a> `strictApprovals?` | `boolean` | The monotonic OR of every layer's strictApprovals (RV1507). | [packages/core/src/runtime/permission-chain.ts:146](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L146) |
