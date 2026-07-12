[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / attachProgress

# Function: attachProgress()

```ts
function attachProgress(handle, io): () => void;
```

Defined in: [packages/cli/src/tui.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/tui.ts#L48)

Attaches the renderer to a handle's event stream; returns a detach.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `handle` | [`RunHandle`](/api/@rulvar/rulvar/interfaces/RunHandle.md)\&lt;`unknown`\&gt; |
| `io` | [`CliIo`](/api/@rulvar/cli/interfaces/CliIo.md) |

## Returns

() => `void`
