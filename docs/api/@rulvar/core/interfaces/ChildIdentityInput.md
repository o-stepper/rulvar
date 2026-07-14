[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ChildIdentityInput

# Interface: ChildIdentityInput

Defined in: [packages/core/src/journal/identity.ts:36](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L36)

Nested workflow spawns: ctx.workflow (kind 'child').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-args"></a> `args` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Canonical JSON of the arguments; opts.key, when set, replaces args. | [packages/core/src/journal/identity.ts:41](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L41) |
| <a id="property-kind"></a> `kind` | `"child"` | - | [packages/core/src/journal/identity.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L37) |
| <a id="property-workflow"></a> `workflow` | `string` | Registered workflow name. | [packages/core/src/journal/identity.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L39) |
