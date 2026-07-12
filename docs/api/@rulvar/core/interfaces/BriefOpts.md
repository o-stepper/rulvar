[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: [packages/core/src/engine/ctx.ts:454](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L454)

Options of ctx.brief (concrete shape fixed in M6-T10): the content to
distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/engine/ctx.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L458) |
| <a id="property-content"></a> `content` | `string` | [packages/core/src/engine/ctx.ts:455](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L455) |
| <a id="property-instruction"></a> `instruction?` | `string` | [packages/core/src/engine/ctx.ts:456](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L456) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | [packages/core/src/engine/ctx.ts:457](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L457) |
