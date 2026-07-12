[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / evaluatePermission

# Function: evaluatePermission()

```ts
function evaluatePermission(
   chain, 
   tool, 
   input, 
ctx?): Promise<PermissionVerdict>;
```

Defined in: `packages/core/dist/index.d.ts`

Evaluates the chain for one dispatch, or OFFLINE against a
hypothetical call by tool name (the dry-run API: nothing executes;
shells and tests read the verdict, the
deciding layer, and the matched rule). Hooks run in deterministic
registration order; { modifiedInput } substitutes the input and
continues; the first decisive verdict wins. The returned input is what
execute receives and what the approval identity hashes (post hook
modification). Advisory domain-rule matches
ride every verdict for the audit payload.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `chain` | [`CompiledPermissionChain`](/api/@rulvar/rulvar/interfaces/CompiledPermissionChain.md) |
| `tool` | \| `string` \| `Pick`\&lt;[`ToolDef`](/api/@rulvar/rulvar/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/rulvar/type-aliases/SchemaSpec.md)\&lt;`unknown`\&gt;\&gt;, `"risk"` \| `"name"` \| `"needsApproval"`\&gt; |
| `input` | `unknown` |
| `ctx?` | [`ToolContext`](/api/@rulvar/rulvar/interfaces/ToolContext.md) |

## Returns

`Promise`\&lt;[`PermissionVerdict`](/api/@rulvar/rulvar/type-aliases/PermissionVerdict.md)\&gt;
