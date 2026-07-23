[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / parseSoakReport

# Function: parseSoakReport()

```ts
function parseSoakReport(path): SoakEvent[];
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:626](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L626)

Parses one report file, tolerating a torn trailing line.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `path` | `string` |

## Returns

[`SoakEvent`](/api/@rulvar/store-conformance/type-aliases/SoakEvent.md)[]
