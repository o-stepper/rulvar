[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:199](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L199)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:203](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L203) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:201](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L201) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L202) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:200](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L200) |
