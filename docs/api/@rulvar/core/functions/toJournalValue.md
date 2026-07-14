[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / toJournalValue

# Function: toJournalValue()

```ts
function toJournalValue(value, site): Json;
```

Defined in: [packages/core/src/journal/serializable.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/serializable.ts#L69)

Validates and snapshots a value for the journal: the returned value is a
JSON round-trip clone, decoupled from later caller mutations, with
undefined object members dropped.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `unknown` |
| `site` | `string` |

## Returns

[`Json`](/api/@rulvar/core/type-aliases/Json.md)
