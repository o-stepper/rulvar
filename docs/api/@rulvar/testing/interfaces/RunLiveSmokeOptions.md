[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / RunLiveSmokeOptions

# Interface: RunLiveSmokeOptions

Defined in: [packages/testing/src/live.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L60)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts?` | `number` | Total attempts including the first: an integer from 1 to [MAX\_LIVE\_SMOKE\_ATTEMPTS](/api/@rulvar/testing/variables/MAX_LIVE_SMOKE_ATTEMPTS.md) (default 3). Anything else, NaN and Infinity included, rejects with ConfigError before any stream opens. | [packages/testing/src/live.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L66) |
| <a id="property-basedelayms"></a> `baseDelayMs?` | `number` | Backoff before retry n (1-based) is `baseDelayMs * n`: a non-negative integer (default 2000). Pass 0 to retry without sleeping (unit tests). The value AND the largest scheduled delay, `baseDelayMs * (attempts - 1)`, must not exceed [MAX\_LIVE\_SMOKE\_DELAY\_MS](/api/@rulvar/testing/variables/MAX_LIVE_SMOKE_DELAY_MS.md) (Node's timer maximum, which would otherwise clamp the sleep to 1 ms). Anything else rejects with ConfigError before any stream opens. | [packages/testing/src/live.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L76) |
