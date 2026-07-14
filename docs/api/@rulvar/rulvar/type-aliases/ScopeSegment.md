[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ScopeSegment

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

Defined in: `packages/core/dist/index.d.ts`

A parsed scope-path segment.
