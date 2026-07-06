# Tools, permissions, and isolation spec

Status: Ready for implementation
Version: 0.2.0-docs
Date: 2026-07-06

Purpose: normative specification of the tool system (tool definitions, SchemaSpec, toolsetHash), the ToolSource seam and MCP bus, the layered permission chain with risk presets, the argv-parsing shell matcher, executors as declared capability, the IsolationProvider worktree lifecycle, and the ToolContext surface.

Requirements for this area live in the FR-4xx block of [docs/01-requirements.md](01-requirements.md) (section "FR registry"). The core tool system, MCP ToolSource, permission chain with ask suspensions, and worktree isolation land in milestone M3 (v0.4.0); risk metadata, permission presets, the argv shell matcher, and audit/dry-run land in M5 (v0.6.0); see [docs/10-implementation-plan.md](10-implementation-plan.md). ToolSource and IsolationProvider are two of the six SPI seams frozen at 1.0; see [docs/02-architecture.md](02-architecture.md) section "SPI seams and the 1.0 freeze".

## 1 Tool definition and toolsetHash

### 1.1 tool() definition and ToolDef

Tools are typed via SchemaSpec (section 2). The definition function is:

```ts
function tool<S extends SchemaSpec>(d: {
  name: string;
  description: string;
  parameters: S;
  version?: string;                        // contract version, part of toolsetHash
  executor?: 'inprocess' | 'subprocess' | 'container';   // default 'inprocess', section 7
  needsApproval?: boolean;                 // default false, section 3.5
  risk?: ToolRisk;                         // risk metadata, section 4.1
  execute(input: Out<S>, ctx: ToolContext): Promise<unknown>;
}): ToolDef;
```

Normative rules:

- The identity projection of a ToolDef is its `ToolContract` `{ name, description, parameters, version }` (declared in 04-model-layer-spec.md, section "Wire contract (L0)"): exactly what the model sees and exactly what `toolsetHash` hashes; `execute` and every other non-contract field are excluded by construction.
- `name` MUST match `^[a-zA-Z0-9_-]{1,64}$` (the intersection of first-party provider tool-name constraints). Violation is a typed `ConfigError` at definition time.
- Two tools with the same name inside one agent's toolset are a `ConfigError` at spawn time (see section 6.4 for the MCP prefixing escape hatch).
- The value returned by `execute` MUST be JSON-serializable; it is recorded as a tool-result record in the agent's canonical history (checkpointed to TranscriptStore, [docs/03-journal-spec.md](03-journal-spec.md) section "Checkpoints"). A non-serializable result is a typed `NonSerializableValueError` surfaced to the model as an error tool result (error taxonomy: [docs/02-architecture.md](02-architecture.md) section "Error taxonomy").
- The runtime MUST validate model-produced arguments against `parameters` before invoking `execute` (section 2.4). Validation failure is surfaced to the model as an error tool result naming the issues; it is never thrown past policy out of the agent loop.
- A tool MAY throw `ModelRetry` from `execute` to signal a model-recoverable error: the runtime converts it into an error tool result carrying the message so the model can correct itself within the same turn budget. Semantic retries via `ModelRetry` are bounded (default 2 attempts, consolidated defaults table in [docs/06-execution-spec.md](06-execution-spec.md) Appendix A).
- Tool execution between the tool's side effect and the turn-boundary checkpoint write is at-least-once on crash/resume; tool implementations SHOULD be idempotent. See [docs/03-journal-spec.md](03-journal-spec.md) section "Two-phase entries, dispatch, and the budget ledger".

### 1.2 The version field

`version` is an opaque string with no ordering semantics imposed by the engine.

- Implementers MUST bump `version` when the semantics of the tool change (same name and compatible schema, different behavior). The bump changes `toolsetHash` and therefore the content key of new agent spawns, so journals recorded against the old semantics are never silently replayed against the new ones.
- Implementers MUST NOT bump `version` for pure implementation changes that preserve semantics: this is what keeps existing journals replayable across refactors.
- An absent `version` participates in the contract tuple as absent (no default is synthesized).

### 1.3 toolsetHash contract

`toolsetHash` is computed from the tool contract, never from the `execute` closure:

- Per-tool contract tuple: `(name, description, canonical parameters JSON Schema, version)`. The canonical JSON Schema is the derived JSON Schema of `parameters` (section 2.3) canonicalized per the rules in [docs/03-journal-spec.md](03-journal-spec.md) section "schemaHash/toolsetHash derivation": RFC 8785 (JCS) ordering, local `$ref` inlined, remote and dynamic `$ref` forbidden, annotation keywords stripped.
- `toolsetHash` = sha256 over the JCS-canonical JSON array of the per-tool contract tuples sorted by `name`.
- Consequences (normative): editing a tool's implementation does not invalidate any journal; changing name, description, parameters schema, or version does, for subsequently spawned agents. `toolsetHash` enters spawn identity ([docs/03-journal-spec.md](03-journal-spec.md) section "Identity model") and its derivation is part of the hashVersion profile (DEF-6).

## 2 SchemaSpec

### 2.1 The three forms

`SchemaSpec` is an L0 contract type with exactly three accepted forms:

```ts
type SchemaSpec =
  | StandardSchemaV1            // form 1: a Standard Schema (Zod, ArkType, Valibot, ...)
  | { jsonSchema: object; validate(v: unknown): v is unknown }   // form 2: pair
  | object;                     // form 3: bare JSON Schema literal
```

### 2.2 Out<S> inference

The inferred input/output type `Out<S>` is, per form:

| Form | Out<S> |
|---|---|
| Standard Schema | the schema's Standard Schema output type |
| `{ jsonSchema, validate }` pair | the type-guard target of `validate()` |
| bare JSON Schema | `unknown` |

### 2.3 JSON Schema derivation and acceptance rules

Every form MUST yield a JSON Schema, because `schemaHash` and `toolsetHash` are computed from the canonicalized derived JSON Schema and because prompt-tier structured output and provider tool declarations need it.

- Form 1: Standard Schema acceptance is via vendored `StandardSchemaV1` types (never a runtime dependency; see [docs/13-toolchain-repo.md](13-toolchain-repo.md) section "Committed toolchain"). The JSON Schema projection uses `StandardJSONSchemaV1`: `'~standard'.jsonSchema.input()` with target draft 2020-12 and fallback draft-07. If the supplied library does not implement the projection, the engine MUST raise a typed `ConfigError` at definition time (not at first call).
- Form 2: `jsonSchema` is taken verbatim as the derived schema; `validate` is the runtime validator.
- Form 3: the object is the derived schema; runtime validation uses the vendored validator.
- The vendored validator is an eval-free JSON Schema validator in the `@cfworker/json-schema` lineage supporting a draft 2020-12 subset: no `$dynamicRef`, no remote `$ref`. Schemas using excluded features are a typed `ConfigError` at definition time. It is the only vendored runtime dependency of `@lurker/core` (the vendored StandardSchemaV1/StandardJSONSchemaV1 declarations are types only and do not count).

### 2.4 Runtime validation

Model-produced tool arguments MUST be validated before `execute` runs: form 1 via the Standard Schema's own validation, form 2 via `validate()`, form 3 via the vendored validator. The same machinery backs the structured-output tiers of the Agent Runtime ([docs/06-execution-spec.md](06-execution-spec.md) section "Agent Runtime binding").

## 3 Permission chain

### 3.1 Layer order

The layered permission chain is the single approval surface for every tool dispatch, regardless of tool origin (native, MCP, orchestrator opt-in tools such as `escalate` and `kb_propose`). The order is fixed and normative:

```
hooks -> deny rules -> ask rules -> canUseTool -> terminal default
```

Evaluation is short-circuit: the first decisive verdict wins. Layers that are not configured are skipped.

### 3.2 Hooks

```ts
type PermissionHook = (
  toolName: string,
  input: unknown,
  ctx: ToolContext
) => HookVerdict | Promise<HookVerdict>;

type HookVerdict = 'allow' | 'deny' | 'ask' | { modifiedInput: unknown } | undefined;
```

- Hooks MAY be sync or async and run in deterministic registration order.
- `'allow'`, `'deny'`, and `'ask'` are decisive and stop the chain.
- `{ modifiedInput }` substitutes the input and continues with the next hook, then the remaining layers. Modified input is what `execute` receives and what later layers evaluate.
- `undefined` (or no return) passes through to the next hook/layer.

### 3.3 Deny rules and ask rules

Deny rules and ask rules are declarative rule tables (no closures). A rule matches by tool name, by declared risk class (compiled from presets, section 4), by argv pattern for the shell tool (section 5), or by network domain for the first-party fetch tool (section 4.4):

```ts
type PermissionRule =
  | { tool: string | string[] }                       // exact tool name(s)
  | { risk: ToolRisk | ToolRisk[] }                   // declared risk class(es)
  | { tool: string; argv: string | string[] }         // argv patterns, section 5
  | { tool: string; domains: string[] };              // domain rules, section 4.4
```

A match in the deny layer yields deny; a match in the ask layer yields ask. Rules never yield allow: allow is only ever the result of falling through to `canUseTool` or the terminal default. This is what lets presets compile into the existing chain without a bypass channel.

Closures (`hooks`, `canUseTool`) are host-side only. A CompiledWorkflow running in the worker sandbox MAY carry only the declarative rule tables; the sanctioned sandbox dialect forbids functions in options ([docs/06-execution-spec.md](06-execution-spec.md) section "Script runners").

### 3.4 canUseTool

```ts
type CanUseTool = (
  toolName: string,
  input: unknown,
  ctx: ToolContext
) => 'allow' | 'deny' | { modifiedInput: unknown } | Promise<'allow' | 'deny' | { modifiedInput: unknown }>;
```

- `canUseTool` is optional. When absent, the chain falls through to the terminal default.
- `'allow'` is decisive, including for tools declared `needsApproval: true`: an explicit programmatic allow overrides the ask default.
- `'deny'` is decisive.
- `{ modifiedInput }` substitutes the input and proceeds to the terminal default.

### 3.5 Terminal default

The terminal default is: allow, unless the tool declares `needsApproval: true`, in which case the verdict is ask.

### 3.6 Verdict semantics

- allow: `execute` is dispatched (through the declared executor, section 7).
- deny: the call is not executed. The denial is surfaced to the model as an error tool result carrying the policy reason; the turn continues. A deny never throws past policy out of the agent loop.
- ask: the ask verdict is journaled as a suspended approval entry (journal kind `approval`) together with the turn-boundary checkpoint, per [docs/03-journal-spec.md](03-journal-spec.md) sections "Suspension and resolutions" (DEF-4) and "Checkpoints". The run suspends; approval resolution arrives through the resolution-entry family (`resolveExternal`, operator action, `deadlineAt` timeout with `defaultDecision`), first-closing-wins. On resume the agent continues from the same turn without re-paying turns and without re-running already executed tools. `deadlineAt` applies to approvals (and Flavor B escalations); see [docs/06-execution-spec.md](06-execution-spec.md) section "Canonical Ctx interface" for the awaitExternal contrast.

### 3.7 Subagent inheritance

Permission configuration (hooks, rules, `canUseTool`, presets) is NOT inherited by subagents implicitly. Inheritance is only by explicit opt-in on the agent profile:

```ts
type AgentProfilePermissions = {
  hooks?: PermissionHook[];
  deny?: PermissionRule[];
  ask?: PermissionRule[];
  canUseTool?: CanUseTool;
  preset?: 'strict' | 'standard' | 'open';   // section 4.3
  inheritPermissions?: boolean;              // default false: children get their own config only
};
```

## 4 Risk metadata and permission presets

### 4.1 ToolRisk

```ts
type ToolRisk = 'read' | 'write' | 'network' | 'execute' | 'destructive';
```

`risk` is declarative metadata on the tool contract (it does NOT enter `toolsetHash`; it is policy input, not identity). Native tools SHOULD declare it. MCP-imported tools carry no risk metadata unless the host supplies a risk map (section 6.2); undeclared risk is a first-class state that presets treat conservatively.

### 4.2 compilePermissionPreset

```ts
function compilePermissionPreset(
  preset: 'strict' | 'standard' | 'open'
): { deny: PermissionRule[]; ask: PermissionRule[] };
```

Presets compile INTO the existing chain layers (deny rules and ask rules). They are never a fifth layer, and they never emit allow-overrides: a preset "allow" cell simply emits no rule, so the call falls through to `canUseTool` and the terminal default (a `needsApproval: true` tool therefore still asks under every preset). Compiled preset rules concatenate after any host-authored rules in the same layer; since rules only deny or ask, ordering within a layer cannot change the verdict.

### 4.3 Shipped presets

The three shipped presets compile to the following verdict-by-risk tables ("allow" = no rule emitted):

| Declared risk | strict | standard | open |
|---|---|---|---|
| read | allow | allow | allow |
| write | ask | allow | allow |
| network | ask | ask | allow |
| execute | ask | ask | allow |
| destructive | deny | ask | allow |
| (undeclared) | ask | ask | allow |

- `strict`: compiled deny rule `{ risk: 'destructive' }`; compiled ask rules `{ risk: ['write', 'network', 'execute'] }` plus an ask rule matching every tool without declared risk.
- `standard`: compiled ask rules `{ risk: ['network', 'execute', 'destructive'] }` plus the undeclared-risk ask rule.
- `open`: compiles to empty tables. `open` is exactly "chain without preset" and MUST be documented as such.

### 4.4 Network-domain rules

Network-domain rules (`{ tool, domains }`) constrain outbound network destinations. Honest enforcement position (normative):

- They are enforced only for the first-party fetch tool: the fetch implementation checks the target host against the rule tables before connecting; a non-matching domain under an ask/deny rule yields the corresponding verdict.
- For arbitrary shell and MCP tools they are ADVISORY: there is no enforcement mechanism outside first-party tools. Advisory matches MUST still be reported in audit events (section 4.5) but MUST NOT be claimed as containment anywhere in documentation or marketing surfaces.

### 4.5 Audit events and dry-run

- Every chain evaluation emits audit telemetry: the verdict (allow/deny/ask), the deciding layer, and the matched rule (if any) ride the `tool:start`/`tool:end` event payloads; ask verdicts additionally emit `approval:pending`. Event payload schemas: [docs/09-observability-testing-spec.md](09-observability-testing-spec.md) section "Event stream". Audit events are telemetry, never identity: allow/deny verdicts are not separately journaled (the tool result in the canonical history is the durable trace); ask verdicts are journaled as suspended approval entries per section 3.6.
- Dry-run is an offline evaluation API, not a runtime execution mode:

```ts
function evaluatePermission(
  chain: CompiledPermissionChain,
  toolName: string,
  input: unknown
): { verdict: 'allow' | 'deny' | 'ask'; decidedBy: 'hook' | 'deny-rule' | 'ask-rule' | 'canUseTool' | 'default'; rule?: PermissionRule };
```

  It evaluates the declarative layers (and any hooks/`canUseTool` the caller supplies) against a hypothetical call without executing anything, for use in tests and shell tooling. Audit and dry-run land in M5.

## 5 Argv-parsing shell matcher

Shell allow/ask/deny is matched through a real argv parser, never a string prefix.

### 5.1 Pattern grammar

```
pattern  := word (" " word)*
word     := literal | "*" | "**"
literal  := any token without whitespace; quotes in rule literals follow shell lexing
```

- `literal` matches exactly one identical token.
- `*` matches exactly one token, any content.
- `**` matches zero or more remaining tokens and MAY appear only as the final word.
- A pattern matches a segment only if it consumes the segment's entire argv.

### 5.2 Matching algorithm

1. Lex the candidate command with a POSIX-like shell lexer: quotes and escapes are honored; no expansion of any kind is performed.
2. Split into segments at the operators `;`, `&&`, `||`, `|`, `&`, and newline.
3. A segment containing command substitution (`$(...)` or backticks), process substitution, or a here-doc is unmatchable and yields ask, always.
4. Leading environment assignments (`FOO=bar cmd ...`) are stripped before matching; a segment consisting only of assignments is treated as unmatched.
5. Redirection operators and their targets are retained as tokens; a pattern that does not account for them fails to match (conservative by construction).
6. Each segment is evaluated against the shell tool's deny patterns, then ask patterns, then allow patterns.

### 5.3 Verdict composition

For a compound command the verdict is the strictest across segments:

- deny if ANY segment matches a deny pattern;
- otherwise ask if ANY segment matches an ask pattern OR fails to match any allow pattern;
- otherwise allow (every segment matched an allow pattern and none matched ask/deny).

Any unmatched segment yields ask, never a silent allow: `npm test; rm -rf /` MUST yield ask (or deny if `rm` patterns are denied) even when `npm test` is allow-listed. This composition rule is the entire point of the matcher and MUST be covered by unit tests in the M5 exit criteria.

## 6 MCP bus

### 6.1 ToolSource seam

`ToolSource` is the SPI seam that makes native tools, in-process MCP servers, and stdio/streamable-http MCP servers indistinguishable to the runtime: every source yields `ToolDef`s, and the Agent Runtime dispatches all of them through the same permission chain, the same journal semantics, and the same `toolsetHash` contract. Minimal normative shape (frozen at 1.0, audit in M9):

```ts
interface ToolSource {
  id: string;
  tools(session: ToolSourceSession): Promise<ToolDef[]>;
}
```

### 6.2 mcp(cfg)

```ts
function mcp(cfg: {
  transport: 'stdio' | 'streamable-http' | 'inprocess';
  command?: string; args?: string[];      // stdio: child process to spawn
  url?: string;                           // streamable-http: server endpoint
  server?: unknown;                       // inprocess: in-memory server instance
  allow?: string[];                       // tool-name filter (pre-prefix); omitted = all
  deny?: string[];                        // tool-name filter (pre-prefix); deny wins over allow
  prefix?: string;                        // namespace for name collisions, section 6.4
  approval?: boolean | Record<string, boolean>;  // maps to needsApproval per tool
  risk?: Record<string, ToolRisk>;        // host-supplied risk labels for imported tools
}): ToolSource;
```

- Exactly the config keys matching the chosen transport MUST be set (`command`/`args` for stdio, `url` for streamable-http, `server` for inprocess); anything else is a `ConfigError`.
- `approval: true` sets `needsApproval: true` on every imported tool; the record form sets it per tool name. Imported tools then flow through the permission chain exactly like native tools (section 3).
- `risk` attaches ToolRisk labels to imported tools so presets can govern them; unlabeled imported tools fall under the undeclared-risk preset row (section 4.3).
- The pinned SDK is `@modelcontextprotocol/sdk` `^1.29`; the SDK v2 migration is a logged post-M3 task ([docs/10-implementation-plan.md](10-implementation-plan.md) section "External dependency and risk notes", [docs/13-toolchain-repo.md](13-toolchain-repo.md) risk register).

### 6.3 tools/list, caching, and listChanged

- `tools/list` MUST be fetched with cursor pagination until exhaustion.
- The resulting tool list is cached per MCP session.
- A `listChanged` notification invalidates the session cache, affecting subsequently spawned agents only. The toolset snapshot for a given agent spawn is captured at spawn time (it is hashed into the spawn's identity via `toolsetHash`) and MUST remain stable for that agent's lifetime; a mid-run `listChanged` MUST NOT mutate an in-flight agent's toolset.
- Provider-side drift of an MCP tool's description or `inputSchema` changes `toolsetHash` and therefore the content key of new spawns; this is intended behavior (never replay a journal against a changed contract), and it is the reason MCP-heavy workflows SHOULD pin server versions.

### 6.4 Filtering and prefixing

- `allow`/`deny` filters apply to original (pre-prefix) tool names; `deny` wins.
- `prefix` namespaces imported names as `${prefix}_${name}`. The resulting name MUST match `^[a-zA-Z0-9_-]{1,64}$`, else `ConfigError`.
- A name collision between two sources in one toolset without a disambiguating prefix is a `ConfigError` at spawn time (section 1.1).

### 6.5 Schema and result mapping

- `inputSchema` becomes the tool's `parameters` in bare JSON Schema form (form 3): `Out` is `unknown`, runtime validation via the vendored validator (section 2.3). An `inputSchema` outside the vendored validator subset is a `ConfigError` when the tool is admitted into a toolset.
- `outputSchema`, when present, MUST be used to validate `structuredContent` of results; a validation failure is surfaced to the model as an error tool result.
- Result mapping onto the tool-result record in the agent's canonical history: when `structuredContent` is present it is the tool result value; otherwise the `content` blocks are mapped (text blocks concatenated as text; non-text blocks preserved as typed parts). `isError: true` maps to an error tool result surfaced to the model; it never throws past policy.
- MCP tools have no `version` field; their contract tuple hashes `version` as absent (section 1.2).

### 6.6 Engine opt-in tools

`escalate` (Flavor B escalations) and `kb_propose` (ModelKnowledge phase 3, M12) register through the same registration path as any opt-in tool on the profile; they receive no special dispatch channel and pass the same permission chain. See [docs/07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md) sections "EscalationProtocol" and "Orchestrator toolset", and [docs/05-model-knowledge-spec.md](05-model-knowledge-spec.md) section "Write path".

## 7 Executors

### 7.1 Declared capability

`ToolDef.executor` declares where `execute` runs: `'inprocess' | 'subprocess' | 'container'`, default `'inprocess'`. The declaration is a capability statement consumed by dispatch and by policy (e.g. hosts MAY deny tools whose declared executor they distrust). An engine with no implementation for a tool's declared executor MUST fail tool registration with a typed `ConfigError` (fail early, not at first call).

### 7.2 Containment posture (honest, normative)

The worker sandbox of CompiledWorkflow ([docs/06-execution-spec.md](06-execution-spec.md) section "Script runners") is a determinism and blast-radius boundary, NOT a security boundary. Containment of hostile code is the job of executors (`subprocess`/`container`) plus worktree isolation (section 8), and of nothing else. See the security-posture NFR in [docs/01-requirements.md](01-requirements.md).

The subprocess and container executor specifications remain a pre-1.0 gap. Until that spec closes, all containment statements in this documentation set are downgraded to plans and MUST NOT be presented as shipped behavior. The open question, with owner milestone and decision trigger, is tracked in [docs/14-open-questions.md](14-open-questions.md) (subprocess/container executor spec). Recorded direction, non-normative until the OQ closes: `subprocess` as a stdin/stdout JSON protocol with a timeout and `cwd` supplied by the IsolationProvider; `container` extracted to a plugin behind an `ExecutorProvider` seam at L0.

## 8 Isolation and worktree lifecycle

### 8.1 IsolationSpec

```ts
type IsolationSpec = 'none' | 'readonly' | { kind: 'worktree'; ref?: string };
```

This value domain is the canonical identity encoding: `isolation` enters spawn identity ([docs/03-journal-spec.md](03-journal-spec.md) section "Identity model").

- `'none'`: tools run against the host working directory; no managed lifecycle.
- `'readonly'`: tools receive the host working directory and the engine compiles a deny rule for tools declaring risk `'write'` or `'destructive'` into the spawn's chain (M5; tools without risk metadata are not blocked). `'readonly'` is a determinism and blast-radius declaration, not containment (section 7.2).
- `{ kind: 'worktree', ref? }`: full worktree lifecycle per section 8.3.

### 8.2 IsolationProvider SPI

```ts
interface IsolationProvider {
  acquire(s: { runId: string; spanId: string; ref?: string }): Promise<{
    cwd: string;
    collect(): Promise<{ files: string[]; patch: Bytes }>;   // Bytes = Uint8Array (L0 alias)
    dispose(keep?: boolean): Promise<void>;
  }>;
}
```

IsolationProvider is a frozen SPI seam ([docs/02-architecture.md](02-architecture.md) section "SPI seams and the 1.0 freeze").

### 8.3 Worktree lifecycle

1. Acquire: the worktree is created from HEAD (or the given `ref`) of the host git repository. A non-git host yields a typed `ConfigError`. The agent's tools receive `cwd` inside the worktree (via ToolContext, section 9).
2. Collect: `collect()` snapshots the list of changed files and a patch. The engine stores the patch in TranscriptStore and returns its reference in `AgentResult.artifacts`. Applying the patch is ALWAYS the caller's responsibility; the engine never auto-applies patches to the host tree.
3. Dispose: `dispose(keep?)` cleans up the worktree; `keepOnError` is an opt-in to retain the tree of a failed agent for inspection.

### 8.4 Pinning, park/unpark, and retainWorktree (DEF-3, DEF-5)

- `maxPinnedWorktrees` (default 4; listed in the consolidated defaults table, [docs/06-execution-spec.md](06-execution-spec.md) Appendix A) is a single pin cap shared by park/unpark pinning and by `retainWorktree` retention on abandon entries (DEF-5).
- Park keeps the child's transcript checkpoint; a worktree-isolated parked node either pins its worktree under the cap or, on cap overflow, keeps the checkpoint but drops the worktree, in which case unpark MUST restart the agent (lineage relation `'unpark-restart'`, DEF-3). A silent resume against a fresh tree is impossible by construction.
- The abandon entry carries `retainCheckpoint?` (default true) and `retainWorktree?` (default false, counted against the same pin cap) (DEF-5); see [docs/03-journal-spec.md](03-journal-spec.md) section "Abandon, derived skipped, reuse-by-reference and node.link".
- Graft admission of a donor with worktree isolation is safe only while the donor's tree is pinned; if the tree was not retained or was destroyed, graft MUST degrade to a fresh admit with `DedupNote: 'graft_unsafe'` (DEF-5). `reuse_full` remains permitted for such donors when the donor root is terminal ok (or escalated): the result (patch, artifacts) is reused by reference without the environment. Mandatory cassette: `worktree-disposed-degrade` (DEF-5), catalogued in [docs/09-observability-testing-spec.md](09-observability-testing-spec.md) and gated in [docs/11-testing-strategy.md](11-testing-strategy.md).

### 8.5 Dispose on timeout and escalations (DEF-4)

When a suspended approval or Flavor B escalation reaches `deadlineAt` and the environment is to be torn down:

- The timeout-dispose is expressed as a resolution entry with `by: 'timeout'` in the resolution family of [docs/03-journal-spec.md](03-journal-spec.md) section "Suspension and resolutions" (DEF-4); the timeout default decision and a racing live decision are never both applied (first-closing-wins; the loser journals as noop).
- Before the tree is destroyed, `dispose` MUST run `collect()` and store the worktree patch into the escalation salvage: `EscalationReport.salvage.worktreePatchRef` ([docs/07-adaptive-orchestration-spec.md](07-adaptive-orchestration-spec.md) section "EscalationProtocol").
- An agent is NEVER resumed into a destroyed environment: any resume path that would require the dropped worktree is a restart (section 8.4), never a silent continue.

## 9 ToolContext

The context handed to `execute` (and to permission hooks and `canUseTool`):

```ts
interface ToolContext {
  runId: string;
  spanId: string;                 // tool span in the run > phase > agent > tool hierarchy (docs/09)
  agent: { agentType: string; label?: string };
  cwd: string;                    // isolation working directory; host cwd under isolation 'none'
  isolation: IsolationSpec;       // the spawn's declared isolation
  signal: AbortSignal;            // fires on cancellation, budget ceiling, UsageLimits expiry
  log(level: 'debug' | 'info' | 'warn' | 'error', msg: string, data?: unknown): void;
}
```

- `cwd` points inside the acquired worktree when `isolation` is `{ kind: 'worktree' }` (section 8.3).
- Long-running tools SHOULD observe `signal` and abort promptly; the engine owns wall-clock and budget enforcement ([docs/06-execution-spec.md](06-execution-spec.md) sections "Three-layer budget" and "UsageLimits (normative)").
- `log` emits telemetry `log` events on the event stream ([docs/09-observability-testing-spec.md](09-observability-testing-spec.md)); it never writes journal entries.
- ToolContext deliberately exposes NO spawn primitives: tools are leaves of the call-and-return tree (invariant I3, [docs/00-overview.md](00-overview.md)); all spawning flows through Ctx primitives under the AdmissionController.
