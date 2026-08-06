[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / EXPOSURE\_WAIT\_SWEEP\_MS

# Variable: EXPOSURE\_WAIT\_SWEEP\_MS

```ts
const EXPOSURE_WAIT_SWEEP_MS: 250 = 250;
```

Defined in: [packages/core/src/engine/budget.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/budget.ts#L78)

Cadence of the parked-waiter sweep (RV2003). The interval's first
job is REFERENCE: a parked exposure wait used to hold nothing on the
event loop, so a process whose only remaining work was the wait
exited silently mid-run (the third parity rerun's terminal shape,
`Warning: Detected unsettled top-level await`). While any waiter is
parked, a ref'd timer keeps the loop alive; each tick additionally
sweeps for the drained state (no holder of any kind left), waking
every waiter 'drained' so a wake lost to a future leak can never
strand them.
