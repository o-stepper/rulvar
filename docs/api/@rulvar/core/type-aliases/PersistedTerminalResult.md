[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PersistedTerminalResult

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

Defined in: [packages/core/src/engine/persisted-terminal.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/persisted-terminal.ts#L70)

The reconstruction verdict: an envelope, or a typed refusal.
