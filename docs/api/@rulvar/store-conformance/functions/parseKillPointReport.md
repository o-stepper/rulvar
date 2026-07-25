[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / parseKillPointReport

# Function: parseKillPointReport()

```ts
function parseKillPointReport(path): KillPointEvent[];
```

Defined in: [packages/store-conformance/src/kill-points.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/kill-points.ts#L333)

Parses one report file, tolerating a torn trailing line.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

[`KillPointEvent`](/api/@rulvar/store-conformance/type-aliases/KillPointEvent.md)[]
