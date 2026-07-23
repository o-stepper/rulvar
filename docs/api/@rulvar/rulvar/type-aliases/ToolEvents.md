[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ToolEvents

# Type Alias: ToolEvents

```ts
type ToolEvents = 
  | {
  risk?: Json;
  toolName: string;
  type: "tool:start";
}
  | {
  advisory?: Json;
  decidedBy?: string;
  durationMs: number;
  guard?: "repeated-signature";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
};
```

Defined in: `packages/core/dist/index.d.ts`

Tool lifecycle (emitters arrive with the tool system, M3).

## Union Members

### Type Literal

```ts
{
  risk?: Json;
  toolName: string;
  type: "tool:start";
}
```

***

### Type Literal

```ts
{
  advisory?: Json;
  decidedBy?: string;
  durationMs: number;
  guard?: "repeated-signature";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | - | `packages/core/dist/index.d.ts` |
| `decidedBy?` | `string` | - | `packages/core/dist/index.d.ts` |
| `durationMs` | `number` | - | `packages/core/dist/index.d.ts` |
| `guard?` | `"repeated-signature"` | Present when an exploration guard (RV-210), not the permission chain, denied the call: the outcome is 'denied' and the call was never dispatched. | `packages/core/dist/index.d.ts` |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | `packages/core/dist/index.d.ts` |
| `rule?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | - | `packages/core/dist/index.d.ts` |
| `toolName` | `string` | - | `packages/core/dist/index.d.ts` |
| `type` | `"tool:end"` | - | `packages/core/dist/index.d.ts` |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | `packages/core/dist/index.d.ts` |
