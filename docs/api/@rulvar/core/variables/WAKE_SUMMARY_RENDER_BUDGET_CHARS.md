[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / WAKE\_SUMMARY\_RENDER\_BUDGET\_CHARS

# Variable: WAKE\_SUMMARY\_RENDER\_BUDGET\_CHARS

```ts
const WAKE_SUMMARY_RENDER_BUDGET_CHARS: 400 = 400;
```

Defined in: [packages/core/src/orchestrator/handles.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/handles.ts#L73)

The committed WakeDigest render budget (docs/06, Appendix A: 400
chars per outputSummary row, the character measure; committed at M10
entry by adopting the implemented distillation cap unchanged, the
value frozen into every cassette since M6). One value serves both
stages: the deterministic distillation cap here and the digest
render default in orchestrate (renderBudgetChars).
