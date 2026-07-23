[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResolutionOutcome

# Type Alias: ResolutionOutcome

```ts
type ResolutionOutcome = 
  | {
  applied: true;
  seq: number;
  woke?: true;
}
  | {
  applied: false;
  reason: "already_resolved" | "target_abandoned";
  seq: number;
  supersededBy: number;
};
```

Defined in: `packages/core/dist/index.d.ts`

## Union Members

### Type Literal

```ts
{
  applied: true;
  seq: number;
  woke?: true;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `applied` | `true` | - | `packages/core/dist/index.d.ts` |
| `seq` | `number` | - | `packages/core/dist/index.d.ts` |
| `woke?` | `true` | The resolution settled a live in-process waiter and the segment continues in place. Absent when the append landed WITHOUT a wake (the journal-fold path: a settled segment, or one already closing when the attempt landed): the append is durable, the closed body never continues, and the continuation belongs to a resume (the suspension ownership rule). Hosts that auto-resume on resolution branch on this instead of racing the settle. | `packages/core/dist/index.d.ts` |

***

### Type Literal

```ts
{
  applied: false;
  reason: "already_resolved" | "target_abandoned";
  seq: number;
  supersededBy: number;
}
```
