[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / DEFAULT\_MAX\_BUFFERED\_EVENTS\_PER\_RUN

# Variable: DEFAULT\_MAX\_BUFFERED\_EVENTS\_PER\_RUN

```ts
const DEFAULT_MAX_BUFFERED_EVENTS_PER_RUN: 50000 = 50_000;
```

Defined in: [packages/cli/src/server.ts:158](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L158)

The default per-run replay-buffer bound (RV409): generous enough
that any ordinary run keeps its full replay (lifecycle events number
in the hundreds; only long `agent:stream` delta torrents approach
tens of thousands), small enough that one delta-heavy run cannot
grow process memory past a few tens of megabytes. Past the bound the
oldest events are dropped and the replay marks the gap; the journal
remains the durable record. Before v1.94.0 an absent
`maxBufferedEventsPerRun` meant unbounded; set an explicit huge
bound (`Number.MAX_SAFE_INTEGER`) to restore that in effect.
