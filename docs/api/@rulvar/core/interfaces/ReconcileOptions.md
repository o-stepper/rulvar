[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ReconcileOptions

# Interface: ReconcileOptions

Defined in: [packages/core/src/stores/reconcile.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L224)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-lease"></a> `lease?` | [`Lease`](/api/@rulvar/core/type-aliases/Lease.md) | A live lease for the run, passed through to the meta write. Over a `fencedWrites` store this makes the repair itself takeover safe: a successor acquiring mid-repair fences the stale rewrite out. | [packages/core/src/stores/reconcile.ts:230](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/stores/reconcile.ts#L230) |
