[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / evaluatePermission

# Function: evaluatePermission()

```ts
function evaluatePermission(
   chain, 
   tool, 
   input, 
ctx?): Promise<PermissionVerdict>;
```

Defined in: [packages/core/src/runtime/permission-chain.ts:236](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/permission-chain.ts#L236)

Evaluates the chain for one dispatch, or OFFLINE against a
hypothetical call by tool name (the dry-run API of docs/08, section
4.5: nothing executes; shells and tests read the verdict, the
deciding layer, and the matched rule). Hooks run in deterministic
registration order; { modifiedInput } substitutes the input and
continues; the first decisive verdict wins. The returned input is what
execute receives and what the approval identity hashes (docs/03,
section 1.2: post hook modification). Advisory domain-rule matches
ride every verdict for the audit payload (docs/08, 4.4).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `chain` | [`CompiledPermissionChain`](/api/@rulvar/core/interfaces/CompiledPermissionChain.md) |
| `tool` | \| `string` \| `Pick`\&lt;[`ToolDef`](/api/@rulvar/core/interfaces/ToolDef.md)\&lt;[`SchemaSpec`](/api/@rulvar/core/type-aliases/SchemaSpec.md)\&gt;, `"name"` \| `"risk"` \| `"needsApproval"`\&gt; |
| `input` | `unknown` |
| `ctx?` | [`ToolContext`](/api/@rulvar/core/interfaces/ToolContext.md) |

## Returns

`Promise`\&lt;[`PermissionVerdict`](/api/@rulvar/core/type-aliases/PermissionVerdict.md)\&gt;
