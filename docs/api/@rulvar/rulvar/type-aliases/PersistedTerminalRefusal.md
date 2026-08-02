[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PersistedTerminalRefusal

# Type Alias: PersistedTerminalRefusal

```ts
type PersistedTerminalRefusal = "unsettled" | "not-terminal" | "unknown-workflow";
```

Defined in: `packages/core/dist/index.d.ts`

Why no persisted terminal could be served. `unsettled`: the journal
carries no run settle, so nothing durable records a terminal (a run
still in flight elsewhere, a segment fenced out by a successor
(RV1009), or a settlement write that failed). `not-terminal`: the
journaled settle is not the journal's last word, either because it
records a status that is not terminal (a run whose latest segment is
still running) or because entries continued PAST it (RV1407: a
detached resolution awaiting its resume, or a successor segment over
a stale settle), which is exactly the evidence `auditRun` derives a
non-terminal status from. `unknown-workflow`: nothing names the
workflow the terminal belongs to, and an envelope that invented one
would be a lie on its most-read field.
