[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionConfig

# Interface: PermissionConfig

Defined in: [packages/core/src/runtime/permission-chain.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L57)

Host-side permission configuration (engine defaults.permissions).

## Extended by

- [`AgentProfilePermissions`](/api/@rulvar/core/interfaces/AgentProfilePermissions.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-approvaldeadlinems"></a> `approvalDeadlineMs?` | `number` | Opt-in deadline for ask verdicts (RV1107): a suspended tool approval nobody resolves within this many milliseconds is DENIED by a journaled resolution by 'timeout' instead of waiting forever. The deadline is journaled ON the suspension entry, so it survives resume and re-arms from the entry, exactly like the flavor B escalation deadline; a racing live decision and the timeout can never both apply (first-closing-wins). A positive integer no larger than the deadline ceiling (one hundred years in milliseconds, RV1204), so now + interval always journals as a valid absolute date. Absent is the historical contract: the approval waits indefinitely. | [packages/core/src/runtime/permission-chain.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L92) |
| <a id="property-ask"></a> `ask?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L60) |
| <a id="property-canusetool"></a> `canUseTool?` | [`CanUseTool`](/api/@rulvar/core/type-aliases/CanUseTool.md) | - | [packages/core/src/runtime/permission-chain.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L61) |
| <a id="property-deny"></a> `deny?` | [`PermissionRule`](/api/@rulvar/core/type-aliases/PermissionRule.md)[] | - | [packages/core/src/runtime/permission-chain.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L59) |
| <a id="property-hooks"></a> `hooks?` | [`PermissionHook`](/api/@rulvar/core/type-aliases/PermissionHook.md)[] | - | [packages/core/src/runtime/permission-chain.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L58) |
| <a id="property-strictapprovals"></a> `strictApprovals?` | `boolean` | Opt-in monotonic approval composition (RV1507, the eighteenth improvement plan). The chain's documented order lets a generic allow (a hook or canUseTool) clear a `needsApproval: true` tool, which is deliberate for tests and trusted hosts and a fail-open hazard for a platform profile. With this set, an ALLOW verdict from a hook or from canUseTool over a needsApproval tool falls through instead of deciding, so the terminal default still asks; deny and ask verdicts keep their power (tightening stays decisive), input modification still applies, and tools without the declaration keep the historical composition byte for byte. Merges monotonically across the engine and profile layers: either level arms it and a profile cannot loosen an engine-armed mode. A non-boolean value refuses at compile (the RV610 posture: a stray 'true' string must never silently disarm the mode it names). | [packages/core/src/runtime/permission-chain.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L78) |
