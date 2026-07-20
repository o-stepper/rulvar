[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / CreateServerOptions

# Interface: CreateServerOptions

Defined in: [packages/cli/src/server.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L58)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-engine"></a> `engine` | [`Engine`](/api/@rulvar/rulvar/interfaces/Engine.md) | - | [packages/cli/src/server.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L59) |
| <a id="property-maxbufferedeventsperrun"></a> `maxBufferedEventsPerRun?` | `number` | Upper bound on buffered SSE replay events per tracked run: past the bound the OLDEST buffered events are dropped in chunks (so the retained replay window stays at least seven eighths of the bound) and counted. A replay that no longer reaches back to a client's cursor carries `x-rulvar-events-dropped: <count>` and a leading SSE comment naming the first retained seq; the journal remains the durable record of the run itself. Absent means unbounded (the historical behavior). | [packages/cli/src/server.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L106) |
| <a id="property-maxtrackedruns"></a> `maxTrackedRuns?` | `number` | Cap on SETTLED tracked runs kept in process memory: when a run settles terminally and neither retention released it, the oldest settled tracked runs beyond the cap are released exactly like a `memoryRetention` verdict (durable state untouched). Live runs are never evicted and do not count toward the cap. Absent means no cap. | [packages/cli/src/server.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L95) |
| <a id="property-memoryretention"></a> `memoryRetention?` | (`meta`) => `boolean` | Opt-in retention of PROCESS MEMORY, decoupled from the durable kind (v1.25.0 scale review P1-2): evaluated when a tracked run settles terminally, after `retention`; a true verdict releases the tracked state (args, outcome, handle, SSE buffer) while the journal and transcripts stay untouched, after which GET status/cost serve from the store exactly as for a run another process owns, and GET events answers with the documented empty stream for a run not live here. | [packages/cli/src/server.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L87) |
| <a id="property-priceusd"></a> `priceUsd?` | (`servedBy`, `usage`) => `number` \| `undefined` | Prices the journal fold behind GET /runs/:id/cost for runs without a settled in-process outcome (the host assembles pricing exactly as it does for the CLI); absent means those usages surface as `unpriced`, never a silent zero. | [packages/cli/src/server.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L68) |
| <a id="property-retention"></a> `retention?` | (`meta`) => `boolean` | Opt-in DURABLE retention (OQ-20 executed at M8-T04): evaluated when a tracked run settles terminally; a true verdict applies engine.deleteRun (transcript cascade, then the journal) and untracks the run. This deletes the durable record; to release only process memory, use `memoryRetention` or `maxTrackedRuns`. Absent means nothing is deleted. | [packages/cli/src/server.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L77) |
| <a id="property-workflows"></a> `workflows` | [`WorkflowRegistry`](/api/@rulvar/rulvar/type-aliases/WorkflowRegistry.md) | The explicit, first-class registry. | [packages/cli/src/server.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L61) |
