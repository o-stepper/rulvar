[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: [packages/core/src/engine/ctx.ts:549](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L549)

Options of ctx.brief (concrete shape fixed in M6-T10): the content to
distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/engine/ctx.ts:553](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L553) |
| <a id="property-content"></a> `content` | `string` | [packages/core/src/engine/ctx.ts:550](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L550) |
| <a id="property-instruction"></a> `instruction?` | `string` | [packages/core/src/engine/ctx.ts:551](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L551) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | [packages/core/src/engine/ctx.ts:552](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L552) |
