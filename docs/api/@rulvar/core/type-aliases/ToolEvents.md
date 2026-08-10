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

Defined in: [packages/core/src/l0/events.ts:491](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L491)

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
| `risk?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:509](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L509) |
| `toolCallId?` | `string` | The model-minted id of this tool call (RV908): the same id the journal's messages and tool-result parts carry, so a consumer pairs start and end EXACTLY even among concurrent same-name calls, instead of FIFO-guessing by (spanId, toolName). Present on every live event this engine emits, and on every replayed reconstruction (whose events exist only when the turn checkpoint blob is retrievable; the id rides the checkpoint's tool-result parts, so even journals written before RV908 name their calls there). Absent only on streams recorded before RV908 or written by foreign emitters, where consumers keep their historical pairing. | [packages/core/src/l0/events.ts:508](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L508) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:494](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L494) |
| `type` | `"tool:start"` | - | [packages/core/src/l0/events.ts:493](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L493) |

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:527](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L527) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:525](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L525) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:517](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L517) |
| `errorCode?` | `string` | The structured failure reason on outcome 'error' (RV1807), so public telemetry distinguishes a not-settled child read from a genuine failure without the private transcript. Engine-stamped literals include 'unknown-tool', 'invalid-arguments', 'model-retry', 'non-serializable-result', 'executor-unregistered', 'unknown-handle', 'child-not-settled', and 'unknown-artifact'; a tool that throws a RulvarError carrying `data.errorCode` surfaces that string, a bare RulvarError surfaces its coarse code class, and anything else stays reasonless. Telemetry, never identity. | [packages/core/src/l0/events.ts:547](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L547) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:534](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L534) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:516](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L516) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:526](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L526) |
| `toolCallId?` | `string` | The same call id as the matching tool:start (RV908). | [packages/core/src/l0/events.ts:515](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L515) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:513](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L513) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:512](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L512) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:524](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L524) |
