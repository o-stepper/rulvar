[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / DEFAULT\_MAX\_PENDING\_EVENTS\_PER\_CLIENT

# Variable: DEFAULT\_MAX\_PENDING\_EVENTS\_PER\_CLIENT

```ts
const DEFAULT_MAX_PENDING_EVENTS_PER_CLIENT: 10000 = 10_000;
```

Defined in: [packages/cli/src/server.ts:139](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/server.ts#L139)

The default per-connection pending-frame bound: generous enough that
a reading consumer never notices (a normal reader keeps the queue
near empty), small enough that a consumer that stopped reading
cannot grow process memory past a few megabytes per connection.
