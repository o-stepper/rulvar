[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KillPointWorkerHooks

# Interface: KillPointWorkerHooks

Defined in: [packages/store-conformance/src/kill-points.ts:464](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L464)

Consumer hooks for [runKillPointWorker](/api/@rulvar/store-conformance/functions/runKillPointWorker.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-kill"></a> `kill?` | () => `void` | The death itself; default SIGKILLs the current process and never returns. In-process protocol tests inject a throwing hook instead, which surfaces through the engine as a store failure. | [packages/store-conformance/src/kill-points.ts:470](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L470) |
