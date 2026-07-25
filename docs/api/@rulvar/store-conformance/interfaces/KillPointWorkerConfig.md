[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointWorkerConfig

# Interface: KillPointWorkerConfig

Defined in: [packages/store-conformance/src/kill-points.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L288)

The per-scenario contract, serialized as JSON into the
`RULVAR_KILL_POINT_CONFIG` environment variable of the spawned worker.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-reportpath"></a> `reportPath` | `string` | JSONL report file the worker appends its events to. | [packages/store-conformance/src/kill-points.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L296) |
| <a id="property-runid"></a> `runId` | `string` | The run both processes drive; the referee resumes this id. | [packages/store-conformance/src/kill-points.ts:292](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L292) |
| <a id="property-scenarioid"></a> `scenarioId` | `string` | Which [KILL\_POINT\_SCENARIOS](/api/@rulvar/store-conformance/variables/KILL_POINT_SCENARIOS.md) entry this worker executes. | [packages/store-conformance/src/kill-points.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L298) |
| <a id="property-storepath"></a> `storePath` | `string` | Store location the writer script constructs its store over. | [packages/store-conformance/src/kill-points.ts:290](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L290) |
| <a id="property-ttlms"></a> `ttlMs` | `number` | Lease ttl the writer's store MUST be constructed with. | [packages/store-conformance/src/kill-points.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L294) |
