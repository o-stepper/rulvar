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
  guard?: "repeated-signature";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
};
```

Defined in: [packages/core/src/l0/events.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L204)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:220](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L220) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:218](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L218) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L210) |
| `guard?` | `"repeated-signature"` | Present when an exploration guard (RV-210), not the permission chain, denied the call: the outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:226](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L226) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:209](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L209) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:219](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L219) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L208) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:207](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L207) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:217](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L217) |
