[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:417](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L417)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:421](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L421) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:419](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L419) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:420](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L420) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:418](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L418) |
