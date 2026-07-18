# Security policy

## Reporting a vulnerability

Report privately through GitHub's [private vulnerability reporting](https://github.com/o-stepper/rulvar/security/advisories/new). It reaches the maintainers without disclosing anything publicly.

Please do not open a public issue for a suspected vulnerability.

Include what you have: the affected package and version, what an attacker gains, and the smallest reproduction you can manage. A journal or a workflow that triggers it is worth more than a description of it.

You should get an acknowledgement within a few days. If a report is valid, we will agree a disclosure timeline with you and credit you in the advisory unless you would rather we did not.

## Supported versions

Security fixes land on the latest minor of the current major and are published as a patch. The thirteen lockstep packages share one version; `@rulvar/compat` is versioned independently.

| Version            | Supported   |
| ------------------ | ----------- |
| 1.x (latest minor) | yes         |
| earlier 1.x minors | no; upgrade |
| 0.x                | no          |

## What is not a vulnerability

Rulvar makes some deliberate non-guarantees. They are design decisions, documented as such, and a report that one of them holds is not a security finding. If you think a non-guarantee is the wrong call, that is a design discussion, and an issue is the right place for it.

- **The worker sandbox is not a security boundary.** `WorkerSandboxRunner` is a determinism and blast-radius boundary: it curates the global scope so a machine-written script cannot reach `fetch`, `process`, or `import`, and it seeds the clock and the RNG so replay is stable. It does not contain hostile code, and it is not designed to. What bounds a workflow's effects comes in layers, and they are different things: the toolset decides what is callable at all; the permission chain gates individual calls (policy, not containment); worktree isolation is a FILESYSTEM boundary only (scoped files and cwd). There is no process boundary and no network boundary in the library: the only shipped executor is in-process, and a tool's `execute` has whatever OS and network access your process has. If you need real process or network containment, that is the responsibility of a custom executor you host (a subprocess, a container, a jail), not something any shipped layer provides. See [Determinism](https://docs.rulvar.com/guide/determinism).
- **`readonly` isolation is a declaration, not containment.** It compiles a deny rule against tools that _declare_ `risk: 'write'` or `risk: 'destructive'`. A write-capable tool that declares no risk is not blocked, and tools imported from an MCP server carry no risk unless the host supplies one. See [Tools](https://docs.rulvar.com/guide/tools).
- **Domain rules on permission entries are advisory.** They ride the verdict's audit payload; they do not block a call. There is no first-party network tool that enforces them.
- **Workflow bodies run in your process.** A human-authored workflow is ordinary TypeScript with full ecosystem access. Determinism is enforced by lint rules and the `ctx` shims, by convention, not by a VM. That is a deliberate trade for embeddability.
- **Tool execution is at-least-once.** Between a tool's execution and the turn-boundary checkpoint, a crash re-runs the tool. Idempotency is the tool author's responsibility, and the [journal guide](https://docs.rulvar.com/guide/journal) says so.

Provider API keys are read from the environment by the adapters and never enter the journal; the event stream masks key-shaped strings by default. A path that puts a secret into a journal entry, a cassette, or an exported span **is** a vulnerability, and we want to hear about it.

## Supply chain

Every package is published from CI through npm trusted publishing (OIDC, no long-lived tokens) with [provenance](https://docs.npmjs.com/generating-provenance-statements) attached. You can verify the chain from the published tarball back to the commit and the workflow that built it:

```bash
npm audit signatures
```

`@rulvar/core` has exactly one runtime dependency (`@modelcontextprotocol/sdk`) and no provider SDKs; each provider SDK lives only inside its own adapter package.

## Scope

The packages published from this repository: `@rulvar/rulvar`, the unscoped `rulvar` pointer, `@rulvar/core`, `@rulvar/anthropic`, `@rulvar/openai`, `@rulvar/bridge-ai-sdk`, `@rulvar/store-sqlite`, `@rulvar/store-conformance`, `@rulvar/compat`, `@rulvar/plan`, `@rulvar/planner`, `@rulvar/testing`, `@rulvar/evals`, `@rulvar/cli`, and `eslint-plugin-rulvar`.
