[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / defaultRedact

# Function: defaultRedact()

```ts
function defaultRedact(value): string;
```

Defined in: [packages/testing/src/vcr.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L61)

Built-in redaction: authorization material never reaches cassette
bytes. Deliberately aggressive; compose a
custom hook for payload-specific secrets.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `string` |

## Returns

`string`
