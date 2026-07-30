[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / GateAudit

# Interface: GateAudit

Defined in: [packages/core/src/runtime/agent-loop.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L352)

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:356](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L356) |
| <a id="property-decidedby"></a> `decidedBy` | `string` | [packages/core/src/runtime/agent-loop.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L354) |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | [packages/core/src/runtime/agent-loop.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L355) |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"ask"` \| `"deny"` | [packages/core/src/runtime/agent-loop.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L353) |
