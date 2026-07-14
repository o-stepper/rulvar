[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / pipelineScope

# Function: pipelineScope()

```ts
function pipelineScope(
   parent, 
   stage, 
   item): string;
```

Defined in: [packages/core/src/journal/scope.ts:29](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L29)

Stage `stage` processing source item `item`: `pipe:<stage>:<item>`.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `parent` | `string` |
| `stage` | `number` |
| `item` | `number` |

## Returns

`string`
