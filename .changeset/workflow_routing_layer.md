---
'@rulvar/core': minor
---

`defineWorkflow` accepts `model`, `routing`, and `effort`, wiring the workflow-defaults layer the resolution chain always documented.

The router has always taken a `workflow` layer and the model routing guide has always described a four-layer chain (call override, agent profile, workflow defaults, engine defaults), but nothing could populate layer 3: `defineWorkflow` took only `{ name, args, errorPolicy }`, so a workflow could not carry a model policy of its own. It now can, which is what you usually want for a whole class of work ("triage is cheap; the incident report is not") instead of repeating the routing on every `ctx.agent` call.

```ts
const triage = defineWorkflow(
  { name: 'triage', routing: { loop: 'anthropic:claude-haiku-4-5' } },
  async (ctx, args: { issues: string[] }) =>
    ctx.parallel(args.issues.map((i) => () => ctx.agent(`Classify: ${i}`))),
);
```

The layer rides the scope, so it follows the **call tree, not the file**: a child spawned through `ctx.workflow` contributes its own defaults inside its scope and they stop at its boundary. It sits under the agent profile and the call override and over the engine defaults, exactly as documented, and it applies to every invocation role the call resolves (loop, extract, finalize, summarize, and each failover fallback).

Backward compatible by construction: a workflow that declares nothing contributes no layer and resolves precisely as before, so existing journals keep their content keys. A `CompiledWorkflow` has no routing surface and contributes no layer.
