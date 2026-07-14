[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / dispositionHook

# Function: dispositionHook()

```ts
function dispositionHook(
   fold, 
   registry, 
   invalidated?): (op) => OperationDisposition;
```

Defined in: `packages/core/dist/index.d.ts`

Adapts the predicate to the matcher's disposition hook: two-phase
operations dispatch on their terminal, single-phase on themselves.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `fold` | [`AbandonFold`](/api/@rulvar/rulvar/interfaces/AbandonFold.md) |
| `registry` | [`DeriverRegistry`](/api/@rulvar/rulvar/type-aliases/DeriverRegistry.md) |
| `invalidated?` | `ReadonlySet`\&lt;`number`\&gt; |

## Returns

(`op`) => [`OperationDisposition`](/api/@rulvar/rulvar/type-aliases/OperationDisposition.md)
