[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / RunLiveSmokeOptions

# Interface: RunLiveSmokeOptions

Defined in: [packages/testing/src/live.ts:51](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L51)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts?` | `number` | Total attempts including the first: an integer from 1 to [MAX\_LIVE\_SMOKE\_ATTEMPTS](/api/@rulvar/testing/variables/MAX_LIVE_SMOKE_ATTEMPTS.md) (default 3). Anything else, NaN and Infinity included, rejects with ConfigError before any stream opens. | [packages/testing/src/live.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L57) |
| <a id="property-basedelayms"></a> `baseDelayMs?` | `number` | Backoff before retry n (1-based) is `baseDelayMs * n`: a non-negative integer (default 2000). Pass 0 to retry without sleeping (unit tests). Anything else rejects with ConfigError before any stream opens. | [packages/testing/src/live.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L64) |
