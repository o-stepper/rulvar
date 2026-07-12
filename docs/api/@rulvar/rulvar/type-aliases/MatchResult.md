[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / MatchResult

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

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

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
| `kind` | `"rerun-dangling"` | A dangling running entry: redispatch live; the terminal reuses running.seq. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `running` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

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
| `kind` | `"rerun"` | A terminal non-replayable entry: rerun live as a fresh operation. | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |
| `running` | [`JournalEntry`](/api/@rulvar/rulvar/type-aliases/JournalEntry.md) | - | [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts) |

***

### Type Literal

```ts
{
  kind: "live";
}
```
