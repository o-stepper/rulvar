[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ReconcileOptions

# Interface: ReconcileOptions

Defined in: `packages/core/dist/index.d.ts`

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/rulvar/type-aliases/Lease.md) | A live lease for the run, passed through to the meta write. Over a `fencedWrites` store this makes the repair itself takeover safe: a successor acquiring mid-repair fences the stale rewrite out. | `packages/core/dist/index.d.ts` |
