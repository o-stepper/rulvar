[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / QuotaLimiterConstructor

# Type Alias: QuotaLimiterConstructor

```ts
type QuotaLimiterConstructor = (rules) => unknown;
```

Defined in: [packages/store-conformance/src/quota-rules.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/quota-rules.ts#L21)

Constructs a limiter over the given rules; the suite closes whatever
it returns (a `close` method is called and awaited when present), so
factories may open real resources for the negative control.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] |

## Returns

`unknown`
