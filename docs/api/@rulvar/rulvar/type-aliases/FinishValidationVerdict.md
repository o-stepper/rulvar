[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / FinishValidationVerdict

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

Defined in: `packages/core/dist/index.d.ts`

The verdict of one validator over one finish attempt.
