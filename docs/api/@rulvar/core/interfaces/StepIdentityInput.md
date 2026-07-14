[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / StepIdentityInput

# Interface: StepIdentityInput

Defined in: [packages/core/src/journal/identity.ts:45](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L45)

Journaled effectful steps: ctx.step (kind 'step').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deps"></a> `deps` | [`Json`](/api/@rulvar/core/type-aliases/Json.md)[] | Declared dependency values (useMemo-style keying). | [packages/core/src/journal/identity.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L50) |
| <a id="property-key"></a> `key` | `string` | opts.key when set, otherwise the step label. | [packages/core/src/journal/identity.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L48) |
| <a id="property-kind"></a> `kind` | `"step"` | - | [packages/core/src/journal/identity.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/identity.ts#L46) |
