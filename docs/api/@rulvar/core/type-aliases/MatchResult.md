[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / MatchResult

# Type Alias: MatchResult

```ts
type MatchResult = 
  | {
  kind: "replay";
  running: JournalEntry;
  terminal: JournalEntry;
}
  | {
  kind: "skip";
  running: JournalEntry;
  terminal?: JournalEntry;
}
  | {
  kind: "rerun-dangling";
  running: JournalEntry;
}
  | {
  kind: "rerun";
  running: JournalEntry;
}
  | {
  kind: "live";
};
```

Defined in: [packages/core/src/journal/matching.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L59)

## Union Members

### Type Literal

```ts
{
  kind: "replay";
  running: JournalEntry;
  terminal: JournalEntry;
}
```

***

### Type Literal

```ts
{
  kind: "skip";
  running: JournalEntry;
  terminal?: JournalEntry;
}
```

***

### Type Literal

```ts
{
  kind: "rerun-dangling";
  running: JournalEntry;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `kind` | `"rerun-dangling"` | A dangling running entry: redispatch live; the terminal reuses running.seq. | [packages/core/src/journal/matching.ts:64](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L64) |
| `running` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) | - | [packages/core/src/journal/matching.ts:65](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L65) |

***

### Type Literal

```ts
{
  kind: "rerun";
  running: JournalEntry;
}
```

| Name | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| `kind` | `"rerun"` | A terminal non-replayable entry: rerun live as a fresh operation. | [packages/core/src/journal/matching.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L69) |
| `running` | [`JournalEntry`](/api/@rulvar/core/type-aliases/JournalEntry.md) | - | [packages/core/src/journal/matching.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/matching.ts#L70) |

***

### Type Literal

```ts
{
  kind: "live";
}
```
