[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/plan](/api/@rulvar/plan/index.md) / QueueFailoverDeps

# Interface: QueueFailoverDeps

Defined in: [packages/plan/src/cassettes.ts:940](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L940)

queue-failover-during-forced-finish (the DEF-7 final cassette;
M8-T03): worker A loses its lease strictly
between the cap decision and the final wake; worker B reclaims with a
bumped fencing epoch and rolls the forced finish forward. The stale
writer's appends are rejected and invisible, exactly one cap decision
exists, and finalization is paid once.

The LeasableStore is INJECTED so this package stays core-only: the
replay test and the record script supply the reference SqliteStore.
One deterministic clock drives lease expiry.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-makestore"></a> `makeStore` | (`now`) => [`JournalStore`](/api/@rulvar/rulvar/interfaces/JournalStore.md) & [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md) | A fresh LeasableStore over the injected clock (SqliteStore ':memory:' in the suite). | [packages/plan/src/cassettes.ts:942](https://github.com/o-stepper/rulvar/blob/main/packages/plan/src/cassettes.ts#L942) |
