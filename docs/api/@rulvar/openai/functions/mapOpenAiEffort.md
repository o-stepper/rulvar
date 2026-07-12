[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapOpenAiEffort

# Function: mapOpenAiEffort()

```ts
function mapOpenAiEffort(effort): {
  downmapped: boolean;
  wire: string;
};
```

Defined in: [packages/openai/src/wire.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L63)

Canonical-to-wire effort (docs/04, sections 3.3 and 5.5): low through
xhigh pass through; canonical max downmaps to xhigh (documented lossy;
recorded in providerMetadata); provider 'none' is reachable only via
providerOptions.openai.reasoningEffort.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `effort` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) |

## Returns

```ts
{
  downmapped: boolean;
  wire: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `downmapped` | `boolean` | [packages/openai/src/wire.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L63) |
| `wire` | `string` | [packages/openai/src/wire.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L63) |
