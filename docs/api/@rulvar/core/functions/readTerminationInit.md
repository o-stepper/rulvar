[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / readTerminationInit

# Function: readTerminationInit()

```ts
function readTerminationInit(entry): 
  | TerminationInitValue
  | undefined;
```

Defined in: [packages/core/src/journal/termination.ts:205](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/termination.ts#L205)

Reads a termination.init entry's payload; undefined when malformed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `entry` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) |

## Returns

  \| [`TerminationInitValue`](/api/@rulvar/core/interfaces/TerminationInitValue.md)
  \| `undefined`
