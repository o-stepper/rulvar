[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PermissionConfig

# Interface: PermissionConfig

Defined in: `packages/core/dist/index.d.ts`

Host-side permission configuration (engine defaults.permissions).

## Extended by

- [`AgentProfilePermissions`](/api/@rulvar/rulvar/interfaces/AgentProfilePermissions.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | Opt-in deadline for ask verdicts (RV1107): a suspended tool approval nobody resolves within this many milliseconds is DENIED by a journaled resolution by 'timeout' instead of waiting forever. The deadline is journaled ON the suspension entry, so it survives resume and re-arms from the entry, exactly like the flavor B escalation deadline; a racing live decision and the timeout can never both apply (first-closing-wins). Absent is the historical contract: the approval waits indefinitely. | `packages/core/dist/index.d.ts` |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/rulvar/type-aliases/CanUseTool.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/rulvar/type-aliases/PermissionRule.md)[] | - | `packages/core/dist/index.d.ts` |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/rulvar/type-aliases/PermissionHook.md)[] | - | `packages/core/dist/index.d.ts` |
