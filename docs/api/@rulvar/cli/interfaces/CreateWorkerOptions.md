[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CreateWorkerOptions

# Interface: CreateWorkerOptions

Defined in: [packages/cli/src/worker.ts:56](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L56)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-argsfor"></a> `argsFor?` | (`meta`) => `unknown` | The OQ-21 interim channel: original in-process run arguments are not journaled in v1, so the host re-supplies them per run. Absent means args resume as undefined (fully replayed prefixes never notice). | [packages/cli/src/worker.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L80) |
| <a id="property-concurrency"></a> `concurrency?` | `number` | Appendix A: leased runs per worker process; default 1. | [packages/cli/src/worker.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L64) |
| <a id="property-extraderivers"></a> `extraDerivers?` | [`KeyDeriver`](/api/@rulvar/rulvar/interfaces/KeyDeriver.md)[] | DEF-6 window extension, in lockstep with the engine assembly. | [packages/cli/src/worker.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L82) |
| <a id="property-onerror"></a> `onError?` | (`runId`, `error`) => `void` | Observability hook for per-run failures; never throws into the loop. | [packages/cli/src/worker.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L84) |
| <a id="property-owner"></a> `owner?` | `string` | Lease owner id; defaults to a per-process identity. | [packages/cli/src/worker.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L66) |
| <a id="property-pollms"></a> `pollMs?` | `number` | Idle sweep cadence for start(); default 1000 ms. | [packages/cli/src/worker.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L74) |
| <a id="property-retention"></a> `retention?` | (`meta`) => `boolean` | Opt-in retention (OQ-20 executed at M8-T04): evaluated during sweeps over SETTLED runs (terminal meta); a true verdict applies engine.deleteRun under a briefly held lease. Absent means everything persists indefinitely. | [packages/cli/src/worker.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L91) |
| <a id="property-store"></a> `store` | [`LeasableStore`](/api/@rulvar/rulvar/interfaces/LeasableStore.md) | The LeasableStore to lease runs from; MUST be the same journal the engine writes (Engine.stores.journal), or the fencing epoch would protect a store nobody appends to. Verified at start. | [packages/cli/src/worker.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L62) |
| <a id="property-ttlms"></a> `ttlMs?` | `number` | The store's lease ttl; the worker renews at ttl/3 (the normative bound). Default: the Appendix A reference 60000 ms. MUST match the store's configured ttl. | [packages/cli/src/worker.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L72) |
