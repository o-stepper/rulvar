[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / collectDeclaredLadders

# Function: collectDeclaredLadders()

```ts
function collectDeclaredLadders(profiles): DeclaredLadder[];
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The ladders a run declares: every advertised profile whose model
spec is a ladder (docs/04, section 12). The card is tier-relative to
exactly these.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `profiles` | \| `Record`\&lt;`string`, [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md)\&gt; \| `undefined` |

## Returns

[`DeclaredLadder`](/api/@rulvar/rulvar/interfaces/DeclaredLadder.md)[]
