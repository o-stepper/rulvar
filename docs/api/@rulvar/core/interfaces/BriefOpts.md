[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / BriefOpts

# Interface: BriefOpts

Defined in: [packages/core/src/engine/ctx.ts:457](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L457)

Options of ctx.brief (docs/06, 2.8; amended during M6-T10 with the
concrete shape): the content to distill plus an optional instruction;
the invocation resolves role 'summarize', so it needs
defaults.routing.summarize, a profile, or the explicit model.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-agenttype"></a> `agentType?` | `string` | [packages/core/src/engine/ctx.ts:461](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L461) |
| <a id="property-content"></a> `content` | `string` | [packages/core/src/engine/ctx.ts:458](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L458) |
| <a id="property-instruction"></a> `instruction?` | `string` | [packages/core/src/engine/ctx.ts:459](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L459) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | [packages/core/src/engine/ctx.ts:460](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/ctx.ts#L460) |
