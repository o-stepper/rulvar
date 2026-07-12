[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / TaskClass

# Type Alias: TaskClass

```ts
type TaskClass = 
  | "code-edit"
  | "investigation"
  | "synthesis"
  | "extraction"
  | "planning"
  | "judging"
  | string & {
};
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

Task-class vocabulary aligned with the role quality floors vocabulary
(docs/04, section "Role quality floors"). Scopeless global statements
are inexpressible: every claim binds a taskClass.
