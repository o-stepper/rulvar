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

Defined in: [packages/core/src/l0/events.ts:319](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L319)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L335) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:333](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L333) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:325](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L325) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:342](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L342) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:324](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L324) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:334](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L334) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:323](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L323) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L322) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:332](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L332) |
