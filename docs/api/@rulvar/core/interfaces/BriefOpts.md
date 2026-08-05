[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: [packages/core/src/engine/ctx.ts:625](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L625)

Options of ctx.brief (concrete shape fixed in M6-T10): the content to
distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/engine/ctx.ts:629](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L629) |
| <a id="property-content"></a> `content` | `string` | [packages/core/src/engine/ctx.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L626) |
| <a id="property-instruction"></a> `instruction?` | `string` | [packages/core/src/engine/ctx.ts:627](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L627) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | [packages/core/src/engine/ctx.ts:628](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L628) |
