[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L181)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:185](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L185) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L183) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L184) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L182) |
