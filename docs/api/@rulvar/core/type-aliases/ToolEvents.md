[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolEvents

# Type Alias: ToolEvents

```ts
type ToolEvents = 
  | {
  risk?: Json;
  toolCallId?: string;
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
  toolCallId?: string;
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
  toolCallId?: string;
  toolName: string;
  type: "tool:start";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `risk?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:337](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L337) |
| `toolCallId?` | `string` | The model-minted id of this tool call (RV908): the same id the journal's messages and tool-result parts carry, so a consumer pairs start and end EXACTLY even among concurrent same-name calls, instead of FIFO-guessing by (spanId, toolName). Present on every live event this engine emits, and on every replayed reconstruction (whose events exist only when the turn checkpoint blob is retrievable; the id rides the checkpoint's tool-result parts, so even journals written before RV908 name their calls there). Absent only on streams recorded before RV908 or written by foreign emitters, where consumers keep their historical pairing. | [packages/core/src/l0/events.ts:336](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L336) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L322) |
| `type` | `"tool:start"` | - | [packages/core/src/l0/events.ts:321](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L321) |

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
  toolCallId?: string;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:355](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L355) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:353](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L353) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:345](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L345) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:362](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L362) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:344](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L344) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:354](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L354) |
| `toolCallId?` | `string` | The same call id as the matching tool:start (RV908). | [packages/core/src/l0/events.ts:343](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L343) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:341](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L341) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:340](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L340) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L352) |
