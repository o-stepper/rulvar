[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / readCassette

# Function: readCassette()

```ts
function readCassette(path): VcrCassette;
```

Defined in: [packages/testing/src/vcr.ts:192](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L192)

Parses a cassette file (one header line plus one JSON row per line).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

[`VcrCassette`](/api/@rulvar/testing/interfaces/VcrCassette.md)
