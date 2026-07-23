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
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
};
```

Defined in: [packages/core/src/l0/events.ts:138](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L138)

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
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:154](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L154) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L152) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:144](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L144) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:143](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L143) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:153](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L153) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:142](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L142) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:141](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L141) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:151](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L151) |
