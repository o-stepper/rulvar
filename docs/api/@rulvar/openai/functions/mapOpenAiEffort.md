[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/openai](/api/@rulvar/openai/index.md) / mapOpenAiEffort

# Function: mapOpenAiEffort()

```ts
function mapOpenAiEffort(effort, options?): {
  downmapped: boolean;
  wire: string;
};
```

Defined in: [packages/openai/src/wire.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L64)

Canonical-to-wire effort: low through xhigh pass through. Canonical
max passes through unchanged on models whose caps declare wire max
support (GPT-5.6 Sol); elsewhere it downmaps to xhigh (documented
lossy; recorded in providerMetadata). Provider 'none' is reachable
only via providerOptions.openai.reasoningEffort.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `effort` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) |
| `options?` | \{ `wireMaxEffort?`: `boolean`; \} |
| `options.wireMaxEffort?` | `boolean` |

## Returns

```ts
{
  downmapped: boolean;
  wire: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `downmapped` | `boolean` | [packages/openai/src/wire.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L67) |
| `wire` | `string` | [packages/openai/src/wire.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L67) |
