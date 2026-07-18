[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / UsageSlice

# Interface: UsageSlice

Defined in: [packages/core/src/l0/entries.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L99)

One (invocation role, serving model) slice of an agent call's usage.
`role` is the phase that PAID the slice (v1.19.0 review P1-2: the
loop, extract, finalize, and summarize phases of one agent call must
land in their own CostReport.byRole buckets even when a single model
serves several of them). Absent on slices written before roles
shipped: readers fall back to the entry's primary
`costAttribution.role`, exactly like the other documented fallbacks.
Policy, never identity.

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="property-role"></a> `role?` | [`InvocationRole`](/api/@rulvar/core/type-aliases/InvocationRole.md) | [packages/core/src/l0/entries.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L102) |
| <a id="property-servedby"></a> `servedBy` | `` `${string}:${string}` `` | [packages/core/src/l0/entries.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L100) |
| <a id="property-usage"></a> `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | [packages/core/src/l0/entries.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/entries.ts#L101) |
