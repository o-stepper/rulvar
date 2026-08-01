[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionConfig

# Interface: PermissionConfig

Defined in: [packages/core/src/runtime/permission-chain.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L56)

Host-side permission configuration (engine defaults.permissions).

## Extended by

- [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | Opt-in deadline for ask verdicts (RV1107): a suspended tool approval nobody resolves within this many milliseconds is DENIED by a journaled resolution by 'timeout' instead of waiting forever. The deadline is journaled ON the suspension entry, so it survives resume and re-arms from the entry, exactly like the flavor B escalation deadline; a racing live decision and the timeout can never both apply (first-closing-wins). Absent is the historical contract: the approval waits indefinitely. | [packages/core/src/runtime/permission-chain.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L71) |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L59) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [packages/core/src/runtime/permission-chain.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L60) |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L58) |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [packages/core/src/runtime/permission-chain.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L57) |
