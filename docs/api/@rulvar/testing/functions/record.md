[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/testing](/api/@rulvar/testing/index.md) / record

# Function: record()

```ts
function record(options): ProviderAdapter[];
```

Defined in: [packages/testing/src/vcr.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/testing/src/vcr.ts#L137)

Wraps live adapters for recording: every completed stream appends one
redacted row to the cassette JSONL. The wrapped adapters are drop-in:
same ids, providers, caps, and event streams.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `adapters`: [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]; `cassette`: `string`; `redact?`: [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md); \} |
| `options.adapters` | [`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[] |
| `options.cassette` | `string` |
| `options.redact?` | [`RedactFn`](/api/@rulvar/testing/type-aliases/RedactFn.md) |

## Returns

[`ProviderAdapter`](/api/@rulvar/rulvar/interfaces/ProviderAdapter.md)[]
