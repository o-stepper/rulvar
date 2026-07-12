[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / GateAudit

# Interface: GateAudit

Defined in: `packages/core/dist/index.d.ts`

The ctx-side verdict for one dispatch, produced by the permission
chain (M3-T03). For 'ask' the loop writes the turn checkpoint with the
pending state FIRST, then suspend() journals the approval entry (or
re-matches an existing one) and parks until a resolution closes it.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-advisory"></a> `advisory?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
| <a id="property-decidedby"></a> `decidedBy` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-rule"></a> `rule?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | `packages/core/dist/index.d.ts` |
| <a id="property-verdict"></a> `verdict` | `"allow"` \| `"deny"` \| `"ask"` | `packages/core/dist/index.d.ts` |
