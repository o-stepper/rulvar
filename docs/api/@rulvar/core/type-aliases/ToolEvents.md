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

Defined in: [packages/core/src/l0/events.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L79)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L95) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L93) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L85) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L84) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L94) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L83) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L82) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:92](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L92) |
