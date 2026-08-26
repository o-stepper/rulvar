[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / DEFAULT\_TERMINAL\_OUTPUT\_FLOOR\_CHARS

# Variable: DEFAULT\_TERMINAL\_OUTPUT\_FLOOR\_CHARS

```ts
const DEFAULT_TERMINAL_OUTPUT_FLOOR_CHARS: 80 = 80;
```

Defined in: [packages/core/src/orchestrator/orchestrate.ts:424](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L424)

The default character floor a limit child's string terminal output
must clear, after trim, to be salvageable as validated output
(RV4704): see OrchestrateAcceptance.minTerminalOutputChars.
