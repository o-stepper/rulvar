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

Defined in: [packages/core/src/l0/events.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L260)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:276](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L276) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L274) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:266](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L266) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:283](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L283) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:265](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L265) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:275](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L275) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L264) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:263](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L263) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:273](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L273) |
