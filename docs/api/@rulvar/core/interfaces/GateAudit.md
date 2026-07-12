[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L172)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:176](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L176) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L174) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:175](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L175) |
| <a id="property-verdict"></a> `verdict` | `"deny"` \| `"allow"` \| `"ask"` | [packages/core/src/runtime/agent-loop.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L173) |
