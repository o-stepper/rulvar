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
  errorCode?: string;
  guard?: "repeated-signature" | "per-tool-cap" | "finalization-window";
  outcome: "ok" | "error" | "denied";
  rule?: Json;
  toolCallId?: string;
  toolName: string;
  type: "tool:end";
  verdict?: "allow" | "deny" | "ask";
};
```

Defined in: [packages/core/src/l0/events.ts:416](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L416)

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
| `risk?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:434](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L434) |
| `toolCallId?` | `string` | The model-minted id of this tool call (RV908): the same id the journal's messages and tool-result parts carry, so a consumer pairs start and end EXACTLY even among concurrent same-name calls, instead of FIFO-guessing by (spanId, toolName). Present on every live event this engine emits, and on every replayed reconstruction (whose events exist only when the turn checkpoint blob is retrievable; the id rides the checkpoint's tool-result parts, so even journals written before RV908 name their calls there). Absent only on streams recorded before RV908 or written by foreign emitters, where consumers keep their historical pairing. | [packages/core/src/l0/events.ts:433](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L433) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:419](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L419) |
| `type` | `"tool:start"` | - | [packages/core/src/l0/events.ts:418](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L418) |

***

### Type Literal

```ts
{
  advisory?: Json;
  decidedBy?: string;
  durationMs: number;
  errorCode?: string;
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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:452](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L452) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:450](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L450) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:442](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L442) |
| `errorCode?` | `string` | The structured failure reason on outcome 'error' (RV1807), so public telemetry distinguishes a not-settled child read from a genuine failure without the private transcript. Engine-stamped literals include 'unknown-tool', 'invalid-arguments', 'model-retry', 'non-serializable-result', 'executor-unregistered', 'unknown-handle', 'child-not-settled', and 'unknown-artifact'; a tool that throws a RulvarError carrying `data.errorCode` surfaces that string, a bare RulvarError surfaces its coarse code class, and anything else stays reasonless. Telemetry, never identity. | [packages/core/src/l0/events.ts:472](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L472) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:459](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L459) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:441](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L441) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:451](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L451) |
| `toolCallId?` | `string` | The same call id as the matching tool:start (RV908). | [packages/core/src/l0/events.ts:440](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L440) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:438](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L438) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:437](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L437) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:449](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L449) |
