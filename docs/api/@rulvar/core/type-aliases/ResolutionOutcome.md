[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResolutionOutcome

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

Defined in: [packages/core/src/journal/resolution.ts:37](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L37)

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
| `applied` | `true` | - | [packages/core/src/journal/resolution.ts:39](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L39) |
| `seq` | `number` | - | [packages/core/src/journal/resolution.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L40) |
| `woke?` | `true` | The resolution settled a live in-process waiter and the segment continues in place. Absent when the append landed WITHOUT a wake (the journal-fold path: a settled segment, or one already closing when the attempt landed): the append is durable, the closed body never continues, and the continuation belongs to a resume (the suspension ownership rule). Hosts that auto-resume on resolution branch on this instead of racing the settle. | [packages/core/src/journal/resolution.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/resolution.ts#L50) |

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
