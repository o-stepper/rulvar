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

Defined in: [packages/core/src/l0/events.ts:528](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L528)

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
| `risk?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:546](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L546) |
| `toolCallId?` | `string` | The model-minted id of this tool call (RV908): the same id the journal's messages and tool-result parts carry, so a consumer pairs start and end EXACTLY even among concurrent same-name calls, instead of FIFO-guessing by (spanId, toolName). Present on every live event this engine emits, and on every replayed reconstruction (whose events exist only when the turn checkpoint blob is retrievable; the id rides the checkpoint's tool-result parts, so even journals written before RV908 name their calls there). Absent only on streams recorded before RV908 or written by foreign emitters, where consumers keep their historical pairing. | [packages/core/src/l0/events.ts:545](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L545) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:531](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L531) |
| `type` | `"tool:start"` | - | [packages/core/src/l0/events.ts:530](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L530) |

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
| `advisory?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:564](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L564) |
| `decidedBy?` | `string` | - | [packages/core/src/l0/events.ts:562](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L562) |
| `durationMs` | `number` | - | [packages/core/src/l0/events.ts:554](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L554) |
| `errorCode?` | `string` | The structured failure reason on outcome 'error' (RV1807), so public telemetry distinguishes a not-settled child read from a genuine failure without the private transcript. Engine-stamped literals include 'unknown-tool', 'invalid-arguments', 'model-retry', 'non-serializable-result', 'executor-unregistered', 'unknown-handle', 'child-not-settled', and 'unknown-artifact'; a tool that throws a RulvarError carrying `data.errorCode` surfaces that string, a bare RulvarError surfaces its coarse code class, and anything else stays reasonless. Telemetry, never identity. | [packages/core/src/l0/events.ts:584](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L584) |
| `guard?` | `"repeated-signature"` \| `"per-tool-cap"` \| `"finalization-window"` | Present when an engine guard, not the permission chain, denied the call: the exploration guards (RV-210) or the finalization window (RV302). The outcome is 'denied' and the call was never dispatched. | [packages/core/src/l0/events.ts:571](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L571) |
| `outcome` | `"ok"` \| `"error"` \| `"denied"` | - | [packages/core/src/l0/events.ts:553](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L553) |
| `rule?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | - | [packages/core/src/l0/events.ts:563](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L563) |
| `toolCallId?` | `string` | The same call id as the matching tool:start (RV908). | [packages/core/src/l0/events.ts:552](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L552) |
| `toolName` | `string` | - | [packages/core/src/l0/events.ts:550](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L550) |
| `type` | `"tool:end"` | - | [packages/core/src/l0/events.ts:549](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L549) |
| `verdict?` | `"allow"` \| `"deny"` \| `"ask"` | Audit fields (M5-T05): the chain verdict, the deciding layer, the matched rule, and advisory domain-rule matches. Telemetry, never identity; ask verdicts additionally journal as suspended approvals. | [packages/core/src/l0/events.ts:561](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L561) |
