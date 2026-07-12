[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ScopeSegment

# Type Alias: ScopeSegment

```ts
type ScopeSegment = 
  | {
  branch: number;
  kind: "parallel";
  site: number;
}
  | {
  item: number;
  kind: "pipeline";
  stage: number;
}
  | {
  kind: "workflow";
  name: string;
  ordinal: number;
}
  | {
  kind: "agent";
  seq: number;
}
  | {
  kind: "plan-node";
  nodeId: string;
};
```

Defined in: [packages/core/src/journal/scope.ts:49](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/journal/scope.ts#L49)

A parsed scope-path segment.
