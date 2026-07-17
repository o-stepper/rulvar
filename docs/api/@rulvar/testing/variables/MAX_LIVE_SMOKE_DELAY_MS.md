[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / MAX\_LIVE\_SMOKE\_DELAY\_MS

# Variable: MAX\_LIVE\_SMOKE\_DELAY\_MS

```ts
const MAX_LIVE_SMOKE_DELAY_MS: 2147483647 = 2_147_483_647;
```

Defined in: [packages/testing/src/live.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L58)

Hard ceiling on every scheduled backoff: Node's maximum timer delay
(2^31 - 1 ms). Anything above it would not sleep longer, it would be
clamped to 1 ms with a TimeoutOverflowWarning, so both `baseDelayMs`
and the largest scheduled delay, `baseDelayMs * (attempts - 1)`, are
validated against this bound before any stream opens.
