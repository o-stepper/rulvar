[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / defaultRedact

# Function: defaultRedact()

```ts
function defaultRedact(value): string;
```

Defined in: [packages/testing/src/vcr.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L60)

Built-in redaction: authorization material never reaches cassette
bytes (docs/11, section 5.2). Deliberately aggressive; compose a
custom hook for payload-specific secrets.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `string` |

## Returns

`string`
