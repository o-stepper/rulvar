[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / FinishValidationVerdict

# Type Alias: FinishValidationVerdict

```ts
type FinishValidationVerdict = 
  | {
  ok: true;
}
  | {
  ok: false;
  reasons: string[];
};
```

Defined in: [packages/core/src/orchestrator/finish-validators.ts:28](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/finish-validators.ts#L28)

The verdict of one validator over one finish attempt.
