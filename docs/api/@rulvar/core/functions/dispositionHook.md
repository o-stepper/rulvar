[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / dispositionHook

# Function: dispositionHook()

```ts
function dispositionHook(
   fold, 
   registry, 
   invalidated?): (op) => OperationDisposition;
```

Defined in: [packages/core/src/journal/disposition.ts:194](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/disposition.ts#L194)

Adapts the predicate to the matcher's disposition hook: two-phase
operations dispatch on their terminal, single-phase on themselves.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fold` | [`AbandonFold`](/api/@rulvar/core/interfaces/AbandonFold.md) |
| `registry` | [`DeriverRegistry`](/api/@rulvar/core/type-aliases/DeriverRegistry.md) |
| `invalidated?` | `ReadonlySet`\&lt;`number`\&gt; |

## Returns

(`op`) => [`OperationDisposition`](/api/@rulvar/core/type-aliases/OperationDisposition.md)
