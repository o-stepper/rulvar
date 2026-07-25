[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L276)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L280) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:278](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L278) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:279](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L279) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:277](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L277) |
