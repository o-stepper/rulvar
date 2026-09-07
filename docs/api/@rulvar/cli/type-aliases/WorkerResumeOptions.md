[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/cli](/api/@rulvar/cli/index.md) / WorkerResumeOptions

# Type Alias: WorkerResumeOptions

```ts
type WorkerResumeOptions = Omit<ResumeOptions, "lease" | "args">;
```

Defined in: [packages/cli/src/worker.ts:260](https://github.com/o-stepper/rulvar/blob/main/packages/cli/src/worker.ts#L260)

The resume posture a worker may forward (RV4913): `ResumeOptions`
without the two fields the worker owns, `lease` and `args`.
