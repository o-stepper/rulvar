[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / StepIdentityInput

# Interface: StepIdentityInput

Defined in: `packages/core/dist/index.d.ts`

Journaled effectful steps: ctx.step (kind 'step').

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-deps"></a> `deps` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)[] | Declared dependency values (useMemo-style keying). | `packages/core/dist/index.d.ts` |
| <a id="property-key"></a> `key` | `string` | opts.key when set, otherwise the step label. | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"step"` | - | `packages/core/dist/index.d.ts` |
