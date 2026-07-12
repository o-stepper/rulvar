[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / toJournalValue

# Function: toJournalValue()

```ts
function toJournalValue(value, site): Json;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Validates and snapshots a value for the journal: the returned value is a
JSON round-trip clone, decoupled from later caller mutations, with
undefined object members dropped.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |
| `site` | `string` |

## Returns

[`Json`](/api/@rulvar/rulvar/type-aliases/Json.md)
