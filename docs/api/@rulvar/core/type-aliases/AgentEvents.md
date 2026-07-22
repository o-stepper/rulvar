[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / AgentEvents

# Type Alias: AgentEvents

```ts
type AgentEvents = 
  | {
  agentType: string;
  label?: string;
  type: "agent:queued";
}
  | {
  agentType: string;
  label?: string;
  model: string;
  role: string;
  type: "agent:start";
}
  | {
  agentType: string;
  costUsd: number;
  entryRef: number;
  label?: string;
  status: string;
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
  | {
  agentType: string;
  error: WireError;
  label?: string;
  type: "agent:error";
  willRetry: boolean;
}
  | {
  agentType: string;
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
}
  | {
  delta: string;
  type: "agent:stream";
};
```

Defined in: [packages/core/src/l0/events.ts:53](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L53)

Agent lifecycle.

## Union Members

### Type Literal

```ts
{
  agentType: string;
  label?: string;
  type: "agent:queued";
}
```

***

### Type Literal

```ts
{
  agentType: string;
  label?: string;
  model: string;
  role: string;
  type: "agent:start";
}
```

***

### Type Literal

```ts
{
  agentType: string;
  costUsd: number;
  entryRef: number;
  label?: string;
  status: string;
  type: "agent:end";
  usage: Usage;
  usageApprox?: boolean;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `agentType` | `string` | - | [packages/core/src/l0/events.ts:58](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L58) |
| `costUsd` | `number` | - | [packages/core/src/l0/events.ts:62](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L62) |
| `entryRef` | `number` | - | [packages/core/src/l0/events.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L63) |
| `label?` | `string` | - | [packages/core/src/l0/events.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L59) |
| `status` | `string` | - | [packages/core/src/l0/events.ts:60](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L60) |
| `type` | `"agent:end"` | - | [packages/core/src/l0/events.ts:57](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L57) |
| `usage` | [`Usage`](/api/@rulvar/core/type-aliases/Usage.md) | - | [packages/core/src/l0/events.ts:61](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L61) |
| `usageApprox?` | `boolean` | Present and true when this agent's usage is approximate rather than reported by the provider (the turn was cut by a transport failure, a ceiling that severed the stream, or an abort). Absent means the provider reported the usage exactly. Mirrors the terminal journal entry's usageApprox. | [packages/core/src/l0/events.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/events.ts#L71) |

***

### Type Literal

```ts
{
  agentType: string;
  error: WireError;
  label?: string;
  type: "agent:error";
  willRetry: boolean;
}
```

***

### Type Literal

```ts
{
  agentType: string;
  attempt: number;
  maxAttempts: number;
  type: "agent:schema-retry";
}
```

***

### Type Literal

```ts
{
  delta: string;
  type: "agent:stream";
}
```

Emitted only when the call opts into streaming; never journaled, never re-emitted.
