[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-conformance](/api/@rulvar/store-conformance/index.md) / SoakEvent

# Type Alias: SoakEvent

```ts
type SoakEvent = 
  | {
  epoch: number;
  t: "grant";
  w: number;
}
  | {
  counter: number;
  epoch: number;
  nonce: string;
  ref?: string;
  seq?: number;
  surface: SoakAcceptSurface;
  t: "accept";
  w: number;
}
  | {
  epoch: number;
  t: "victim";
  vid: string;
  w: number;
}
  | {
  epoch: number;
  surface: SoakProbeSurface;
  t: "stale-reject";
  w: number;
}
  | {
  epoch: number;
  surface: string;
  t: "stale-accept";
  w: number;
}
  | {
  epoch: number;
  t: "live-cross-reject";
  w: number;
}
  | {
  epoch: number;
  surface: string;
  t: "fence-kick";
  w: number;
}
  | {
  surface: string;
  t: "busy";
  w: number;
}
  | {
  epoch: number;
  t: "renewed";
  w: number;
}
  | {
  epoch: number;
  t: "released";
  w: number;
}
  | {
  epoch: number;
  t: "stall";
  w: number;
}
  | {
  surface: string;
  t: "victim-abandoned";
  vid: string;
  w: number;
  why: string;
}
  | {
  message: string;
  surface: string;
  t: "error";
  w: number;
}
  | {
  message: string;
  t: "fatal";
  w: number;
}
  | {
  t: "done";
  w: number;
};
```

Defined in: [packages/store-conformance/src/multi-process-soak.ts:59](https://github.com/o-stepper/rulvar/blob/main/packages/store-conformance/src/multi-process-soak.ts#L59)

One JSONL line of a writer's report file (`w` is the writer index).
