[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PersistedTerminalResult

# Type Alias: PersistedTerminalResult

```ts
type PersistedTerminalResult = 
  | {
  available: true;
  envelope: TerminalEnvelope;
}
  | {
  available: false;
  message: string;
  reason: PersistedTerminalRefusal;
};
```

Defined in: `packages/core/dist/index.d.ts`

The reconstruction verdict: an envelope, or a typed refusal.
