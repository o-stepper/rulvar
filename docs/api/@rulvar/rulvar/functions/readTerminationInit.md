[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / readTerminationInit

# Function: readTerminationInit()

```ts
function readTerminationInit(entry): 
  | TerminationInitValue
  | undefined;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Reads a termination.init entry's payload; undefined when malformed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) |

## Returns

  \| [`TerminationInitValue`](/api/@rulvar/rulvar/interfaces/TerminationInitValue.md)
  \| `undefined`
