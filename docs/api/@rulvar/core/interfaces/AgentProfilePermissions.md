[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentProfilePermissions

# Interface: AgentProfilePermissions

Defined in: [packages/core/src/runtime/permission-chain.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L80)

Profile-level permissions.
inheritPermissions governs SUBAGENT inheritance (mode c orchestrators,
M6+): children get their own config only unless explicitly opted in.
It is carried as data here and consumed by the spawning layers.

## Extends

- [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | Opt-in deadline for ask verdicts (RV1107): a suspended tool approval nobody resolves within this many milliseconds is DENIED by a journaled resolution by 'timeout' instead of waiting forever. The deadline is journaled ON the suspension entry, so it survives resume and re-arms from the entry, exactly like the flavor B escalation deadline; a racing live decision and the timeout can never both apply (first-closing-wins). Absent is the historical contract: the approval waits indefinitely. | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`approvalDeadlineMs`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-approvaldeadlinems) | [packages/core/src/runtime/permission-chain.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L71) |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`ask`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-ask) | [packages/core/src/runtime/permission-chain.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L59) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`canUseTool`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-canusetool) | [packages/core/src/runtime/permission-chain.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L60) |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`deny`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-deny) | [packages/core/src/runtime/permission-chain.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L58) |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [`PermissionConfig`](/api/@rulvar/core/interfaces/PermissionConfig.md).[`hooks`](/api/@rulvar/core/interfaces/PermissionConfig.md#property-hooks) | [packages/core/src/runtime/permission-chain.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L57) |
| <a id="property-inheritpermissions"></a> `inheritPermissions?` | `boolean` | Default false. | - | [packages/core/src/runtime/permission-chain.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L84) |
| <a id="property-preset"></a> `preset?` | `"strict"` \| `"standard"` \| `"open"` | Compiles into deny/ask rules; ships in M5. | - | [packages/core/src/runtime/permission-chain.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L82) |
