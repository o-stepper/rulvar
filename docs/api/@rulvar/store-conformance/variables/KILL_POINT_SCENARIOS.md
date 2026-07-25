[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / KILL\_POINT\_SCENARIOS

# Variable: KILL\_POINT\_SCENARIOS

```ts
const KILL_POINT_SCENARIOS: readonly KillPointScenario[];
```

Defined in: [packages/store-conformance/src/kill-points.ts:120](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L120)

The full table: both brackets of all five write points. The expected
counts ARE the engine's documented recovery semantics; a count moving
here means the durability contract moved and the change must be
deliberate.
