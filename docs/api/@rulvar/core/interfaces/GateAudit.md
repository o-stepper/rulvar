[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L334)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:338](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L338) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L336) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L337) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L335) |
