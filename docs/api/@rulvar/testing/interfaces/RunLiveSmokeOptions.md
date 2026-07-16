[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / RunLiveSmokeOptions

# Interface: RunLiveSmokeOptions

Defined in: [packages/testing/src/live.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L37)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-attempts"></a> `attempts?` | `number` | Total attempts including the first (default 3, minimum 1). | [packages/testing/src/live.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L39) |
| <a id="property-basedelayms"></a> `baseDelayMs?` | `number` | Backoff before retry n (1-based) is `baseDelayMs * n` (default 2000). Pass 0 to retry without sleeping (unit tests). | [packages/testing/src/live.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L44) |
