[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / buildFrozenV1JournalRaw

# Function: buildFrozenV1JournalRaw()

```ts
function buildFrozenV1JournalRaw(): Record<string, unknown>[];
```

Defined in: [packages/testing/src/cassettes/build-fixtures.ts:535](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/cassettes/build-fixtures.ts#L535)

The frozen v1 journal: a
round-1 JSONL file with kinds agent, step, rand, external, approval and
the legacy `v: 1` field (no hashVersion member). Returned as raw
JSON-ready objects, one per line.

## Returns

`Record`\&lt;`string`, `unknown`\&gt;[]
