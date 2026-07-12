[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolEvents

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

Defined in: [packages/core/src/l0/events.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L63)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L79) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L77) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L69) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L68) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L78) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L67) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:66](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L66) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L76) |
