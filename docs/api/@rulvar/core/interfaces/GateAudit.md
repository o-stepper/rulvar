[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:287](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L287)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:291](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L291) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:289](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L289) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L290) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L288) |
