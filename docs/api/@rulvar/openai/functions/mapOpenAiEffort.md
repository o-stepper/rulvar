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

Defined in: [packages/openai/src/wire.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L65)

Canonical-to-wire effort: low through xhigh pass through. Canonical
max passes through unchanged on models whose caps declare wire max
support (the whole GPT-5.6 family, each sibling verified live
2026-07-18; v1.20.0 review P2-3); elsewhere it downmaps to xhigh
(documented lossy; recorded in providerMetadata). Provider 'none' is
reachable only via providerOptions.openai.reasoningEffort.

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
| `downmapped` | `boolean` | [packages/openai/src/wire.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L68) |
| `wire` | `string` | [packages/openai/src/wire.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/openai/src/wire.ts#L68) |
