[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PermissionGate

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

Defined in: `packages/core/dist/index.d.ts`

## Type Declaration

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `audit?` | [`GateAudit`](/api/@rulvar/rulvar/interfaces/GateAudit.md) | Chain audit payload ridden into tool:end telemetry. | `packages/core/dist/index.d.ts` |
