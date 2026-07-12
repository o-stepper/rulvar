[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / TaskClass

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

Defined in: [packages/core/src/l0/spi/knowledge.ts:24](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/spi/knowledge.ts#L24)

Task-class vocabulary aligned with the role quality floors vocabulary
(docs/04, section "Role quality floors"). Scopeless global statements
are inexpressible: every claim binds a taskClass.
