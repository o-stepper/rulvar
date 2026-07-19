[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / renderEventLine

# Function: renderEventLine()

```ts
function renderEventLine(event): string | undefined;
```

Defined in: [packages/cli/src/tui.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/tui.ts#L22)

Renders one event to a line, or undefined for silent event types. The
composed line is sanitized so an untrusted provider/tool/log string
cannot inject a control sequence or a second physical line (v1.21.0
review P2-1).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | [`WorkflowEvent`](/api/@rulvar/rulvar/type-aliases/WorkflowEvent.md) |

## Returns

`string` \| `undefined`
