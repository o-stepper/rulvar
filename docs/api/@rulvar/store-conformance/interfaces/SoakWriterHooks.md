[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / SoakWriterHooks

# Interface: SoakWriterHooks

Defined in: [packages/store-conformance/src/multi-process-soak.ts:107](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L107)

Consumer hooks for [runSoakWriter](/api/@rulvar/store-conformance/functions/runSoakWriter.md).

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-retryable"></a> `retryable?` | (`thrown`) => `boolean` | Classifies a thrown store error as transient contention worth an in-place retry (for `SqliteStore`, the driver's SQLITE_BUSY under `BEGIN IMMEDIATE`). Typed `LeaseHeldError` and `JournalOrderViolation` are classified by the protocol itself and never reach this hook. Default: nothing is retryable. | [packages/store-conformance/src/multi-process-soak.ts:115](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L115) |
