[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PermissionGate

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

Defined in: [packages/core/src/runtime/agent-loop.ts:188](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L188)

## Type Declaration

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `audit?` | [`GateAudit`](/api/@rulvar/core/interfaces/GateAudit.md) | Chain audit payload ridden into tool:end telemetry. | [packages/core/src/runtime/agent-loop.ts:198](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L198) |
