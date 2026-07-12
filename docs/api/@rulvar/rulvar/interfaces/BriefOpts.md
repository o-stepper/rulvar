[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: `packages/core/dist/index.d.ts`

Options of ctx.brief (concrete shape fixed in M6-T10): the content to
distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-content"></a> `content` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-instruction"></a> `instruction?` | `string` | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | `packages/core/dist/index.d.ts` |
