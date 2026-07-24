[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / quotaRuleAdmission

# Function: quotaRuleAdmission()

```ts
function quotaRuleAdmission(
   rule, 
   counters, 
   estimate, 
   msUntilWindowEnd): 
  | {
  admit: true;
}
  | {
  admit: false;
  reason: string;
  retryAfterMs: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

One rule's admission verdict against its current-window counters,
the pure decision both reference implementations share. A denial
carries the window remainder as retryAfterMs, except when the
estimate alone can never fit the token cap: that denial says
retryAfterMs 0 (retry immediately), so the caller's bounded
attempts exhaust without waiting and failover gets its chance.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rule` | [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md) |
| `counters` | [`QuotaCounters`](/api/@rulvar/rulvar/interfaces/QuotaCounters.md) |
| `estimate` | [`QuotaCounters`](/api/@rulvar/rulvar/interfaces/QuotaCounters.md) |
| `msUntilWindowEnd` | `number` |

## Returns

  \| \{
  `admit`: `true`;
\}
  \| \{
  `admit`: `false`;
  `reason`: `string`;
  `retryAfterMs`: `number`;
\}
