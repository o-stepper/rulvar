[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / MAX\_LIVE\_SMOKE\_ATTEMPTS

# Variable: MAX\_LIVE\_SMOKE\_ATTEMPTS

```ts
const MAX_LIVE_SMOKE_ATTEMPTS: 10 = 10;
```

Defined in: [packages/testing/src/live.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/live.ts#L49)

Hard ceiling on `runLiveSmoke` attempts. The helper's whole contract
is a bounded spend, so it refuses configurations that are not.
