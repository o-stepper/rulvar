[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: [packages/core/src/engine/ctx.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L531)

Options of ctx.brief (concrete shape fixed in M6-T10): the content to
distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/engine/ctx.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L535) |
| <a id="property-content"></a> `content` | `string` | [packages/core/src/engine/ctx.ts:532](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L532) |
| <a id="property-instruction"></a> `instruction?` | `string` | [packages/core/src/engine/ctx.ts:533](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L533) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | [packages/core/src/engine/ctx.ts:534](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L534) |
