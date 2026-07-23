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

Defined in: [packages/core/src/l0/events.ts:168](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L168)

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:184](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L184) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:182](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L182) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:174](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L174) |
| `guard?` | `"repeated-signature"` | Present when an exploration guard (RV-210), not the permission chain, denied the call: the outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:190](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L190) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:173](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L173) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:183](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L183) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:172](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L172) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:171](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L171) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:181](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L181) |
