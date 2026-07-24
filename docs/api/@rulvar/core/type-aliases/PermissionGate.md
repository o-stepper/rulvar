[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionGate

# Type Alias: PermissionGate

```ts
type PermissionGate = 
  | {
  input: unknown;
  kind: "allow";
}
  | {
  kind: "deny";
  reason: string;
}
  | {
  input: unknown;
  kind: "ask";
  suspend: () => Promise<{
     decision: "allow" | "deny";
     reason?: string;
  }>;
} & {
  audit?: GateAudit;
};
```

Defined in: [packages/core/src/runtime/agent-loop.ts:243](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L243)

## Type Declaration

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `audit?` | [`GateAudit`](/api/@rulvar/core/interfaces/GateAudit.md) | Chain audit payload ridden into tool:end telemetry. | [packages/core/src/runtime/agent-loop.ts:253](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L253) |
