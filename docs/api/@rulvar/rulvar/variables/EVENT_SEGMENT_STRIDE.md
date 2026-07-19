[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / EVENT\_SEGMENT\_STRIDE

# Variable: EVENT\_SEGMENT\_STRIDE

```ts
const EVENT_SEGMENT_STRIDE: number;
```

Defined in: `packages/core/dist/index.d.ts`

The distance between the telemetry counter bases of two consecutive
execution segments of one run: segment k of a run starts its event
`seq` and span counter at `k * EVENT_SEGMENT_STRIDE`. A single
segment would need over four billion events to reach the next base,
so `seq` stays strictly increasing and `spanId` unique across
suspend/resume and process recreation while remaining an ordinary
safe-integer number (v1.22.0 review P1-2). Informational for
consumers: treat `seq` as ordered and `spanId` as opaque, never
parse segment structure out of either.
