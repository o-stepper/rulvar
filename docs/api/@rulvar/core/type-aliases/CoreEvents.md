[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CoreEvents

# Type Alias: CoreEvents

```ts
type CoreEvents = 
  | {
  resumed: boolean;
  type: "run:start";
  workflow: string;
}
  | {
  acceptanceChildren?: {
     child: string;
     evidence?: {
        floorRequired?: true;
        met: boolean;
        minEntries: number;
        recordedEntries: number;
        waivedBySalvage?: true;
     };
     salvage?: "partial" | "terminal-output";
     status: string;
  }[];
  belowFloorOkChildren?: string[];
  childStatusCounts?: Record<string, number>;
  completion?: "complete" | "partial" | "rejected";
  degradedReasons?: string[];
  envelope: TerminalEnvelope;
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
  settled?: false;
  settledReason?: "superseded";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  type: "run:end";
  usageApprox?: boolean;
}
  | {
  phase: string;
  type: "phase:start";
}
  | {
  data?: Json;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  type: "log";
}
  | {
  committedReserveUsd: number;
  remainingUsd: number | null;
  spentUsd: number;
  type: "budget:update";
}
  | {
  deadlineAt?: string;
  entryRef: number;
  key: string;
  prompt?: string;
  type: "external:waiting";
}
  | {
  deadlineAt?: string;
  entryRef: number;
  toolName: string;
  type: "approval:pending";
}
  | {
  scope: string;
  type: "child:start";
  workflow: string;
}
  | {
  scope: string;
  status: string;
  type: "child:end";
  workflow: string;
};
```

Defined in: [packages/core/src/l0/events.ts:19](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L19)

Run lifecycle and core telemetry (M1 subset).

## Union Members

### Type Literal

```ts
{
  resumed: boolean;
  type: "run:start";
  workflow: string;
}
```

***

### Type Literal

```ts
{
  acceptanceChildren?: {
     child: string;
     evidence?: {
        floorRequired?: true;
        met: boolean;
        minEntries: number;
        recordedEntries: number;
        waivedBySalvage?: true;
     };
     salvage?: "partial" | "terminal-output";
     status: string;
  }[];
  belowFloorOkChildren?: string[];
  childStatusCounts?: Record<string, number>;
  completion?: "complete" | "partial" | "rejected";
  degradedReasons?: string[];
  envelope: TerminalEnvelope;
  salvagedPartialChildren?: string[];
  salvagedTerminalOutputChildren?: string[];
  settled?: false;
  settledReason?: "superseded";
  status: "ok" | "error" | "cancelled" | "exhausted" | "suspended";
  totalUsd: number;
  type: "run:end";
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `acceptanceChildren?` | \{ `child`: `string`; `evidence?`: \{ `floorRequired?`: `true`; `met`: `boolean`; `minEntries`: `number`; `recordedEntries`: `number`; `waivedBySalvage?`: `true`; \}; `salvage?`: `"partial"` \| `"terminal-output"`; `status`: `string`; \}[] | The per-child acceptance roster (RV806): status, salvage arm, and the evidence verdict where the child declared a contract; same lift and posture as the fields above. | [packages/core/src/l0/events.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L103) |
| `belowFloorOkChildren?` | `string`[] | Children that settled 'ok' below their declared evidence floor (RV1412); same lift. Under the default their shortfall is a degradation note and the verdict is untouched; under `acceptance.requireEvidenceFloor` they also counted against the policy. | [packages/core/src/l0/events.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L72) |
| `childStatusCounts?` | `Record`\&lt;`string`, `number`\&gt; | Settled child statuses by status name, lifted from the same envelope (or typed error data) when it carries a valid record of nonnegative integers. Absent otherwise. | [packages/core/src/l0/events.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L52) |
| `completion?` | `"complete"` \| `"partial"` \| `"rejected"` | The semantic completion lift (RV-207 tail): present when the workflow reported semantic completion through the completion envelope contract: an `ok`/`exhausted` run whose result value is an object carrying a valid `completion` literal, or an `error` run whose typed error data carries one (the orchestrator acceptance path emits both). Transport status says whether the run ran; completion says whether the work is COMPLETE: an accepted degraded run is `status: 'ok'` with `completion: 'partial'`. Replay recomputes the same value from the re-executed workflow, so the field is identical live and replayed. Absent when the workflow makes no completion claim. | [packages/core/src/l0/events.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L46) |
| `degradedReasons?` | `string`[] | Per-child degradation notes, lifted from the same envelope (or typed error data) when it carries a valid string array (the fifth experiment, cycle 75). An empty array is the workflow's claim of zero degradation; absence means no claim. The outcome mirror spreads the SAME lift, so the surfaces cannot disagree. | [packages/core/src/l0/events.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L60) |
| `envelope` | [`TerminalEnvelope`](/api/@rulvar/core/interfaces/TerminalEnvelope.md) | The unified terminal envelope (RV1105): every terminal fact in ONE shape, the same object the resolved outcome carries, so an event-only consumer assembles nothing. On the settled paths the sibling fields above stay byte for byte; when settlement did not hold, `envelope.settled` mirrors the `settled: false` mark (with `settledReason` inside for the superseded arc, RV1009). | [packages/core/src/l0/events.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L124) |
| `salvagedPartialChildren?` | `string`[] | Children accepted by acceptPartialChildren; same lift. | [packages/core/src/l0/events.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L62) |
| `salvagedTerminalOutputChildren?` | `string`[] | Children accepted through validated terminal output salvage on 'limit'; same lift. | [packages/core/src/l0/events.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L64) |
| `settled?` | `false` | Present and false ONLY when nothing durable records this terminal: a settlement write failed (the run_settle journal append or the terminal RunMeta projection, RV907), or the segment was superseded (`settledReason` names it, RV1009). The status above is true as computation, but `handle.result` rejects typed instead of resolving (SettlementError or SupersededError), and an event-only consumer must not treat this terminal as green. After a settlement failure, resuming the run re-settles by replay (no provider call) and the settled terminal carries no field, byte for byte like every ordinary run. Never emitted true. | [packages/core/src/l0/events.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L86) |
| `settledReason?` | `"superseded"` | Present only beside `settled: false`, naming WHY the terminal refused green when the reason is not a settlement write fault: 'superseded' means the run_settle append bounced off the store's fence because a successor segment holds the lease and owns settlement (RV1009), and `handle.result` rejects with the typed SupersededError. A settlement WRITE failure keeps its historical shape (`settled: false` with no reason) byte for byte. | [packages/core/src/l0/events.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L97) |
| `status` | `"ok"` \| `"error"` \| `"cancelled"` \| `"exhausted"` \| `"suspended"` | - | [packages/core/src/l0/events.ts:23](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L23) |
| `totalUsd` | `number` | - | [packages/core/src/l0/events.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L24) |
| `type` | `"run:end"` | - | [packages/core/src/l0/events.ts:22](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L22) |
| `usageApprox?` | `boolean` | Present and true when any priced usage folded into totalUsd is approximate (a transport cut, a stream the ceiling severed, or an abort left a turn's usage estimated rather than reported by the provider), so totalUsd is a lower bound estimate, never an exact charge. Absent means every contributing turn reported exact usage. | [packages/core/src/l0/events.ts:32](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L32) |

***

### Type Literal

```ts
{
  phase: string;
  type: "phase:start";
}
```

***

### Type Literal

```ts
{
  data?: Json;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  type: "log";
}
```

***

### Type Literal

```ts
{
  committedReserveUsd: number;
  remainingUsd: number | null;
  spentUsd: number;
  type: "budget:update";
}
```

***

### Type Literal

```ts
{
  deadlineAt?: string;
  entryRef: number;
  key: string;
  prompt?: string;
  type: "external:waiting";
}
```

***

### Type Literal

```ts
{
  deadlineAt?: string;
  entryRef: number;
  toolName: string;
  type: "approval:pending";
}
```

***

### Type Literal

```ts
{
  scope: string;
  type: "child:start";
  workflow: string;
}
```

***

### Type Literal

```ts
{
  scope: string;
  status: string;
  type: "child:end";
  workflow: string;
}
```
