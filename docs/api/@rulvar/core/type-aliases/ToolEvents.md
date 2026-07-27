[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolEvents

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
  guard?: "repeated-signature" | "per-tool-cap" | "finalization-window";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
};
```

Defined in: [packages/core/src/l0/events.ts:252](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L252)

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
  guard?: "repeated-signature" | "per-tool-cap" | "finalization-window";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:268](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L268) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L266) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:258](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L258) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L275) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:257](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L257) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:267](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L267) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:256](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L256) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:255](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L255) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L265) |
