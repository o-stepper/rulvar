# lurker documentation index

- Status: Ready for implementation
- Version: 0.2.0-docs
- Date: 2026-07-06
- Purpose: entry point for the lurker documentation set: canon statement, document inventory, reading order, conventions, and shared ID schemes.

## 1. Canon statement

This `docs/` set (English) is the single source of truth for the lurker project.

The set is self-contained by requirement: an implementer, human or LLM, MUST be able to build the project from `docs/` alone. Any information needed for implementation that is missing from `docs/` is a documentation defect and MUST be fixed by amending the relevant doc.

## 2. Document inventory

| File | Purpose |
|---|---|
| README.md | This index: canon statement, reading order, conventions, ID schemes. |
| 00-overview.md | What lurker is: goals, invariants I1-I6, orchestration modes, component map, glossary. |
| 01-requirements.md | Requirement registry: FR-xxx, NFR-xx, EXC-nn exclusions, hypotheses, traceability matrix. |
| 02-architecture.md | Layers L0-L6, the twelve components, package map, SPI seams and the 1.0 freeze, error taxonomy, engine anatomy. |
| 03-journal-spec.md | Journal kernel: entry identity, scope-path grammar, hashVersion, kinds registry, replay predicate, suspension, storage SPI. |
| 04-model-layer-spec.md | Wire contract, provider adapters (@lurker/anthropic, @lurker/openai), canonical effort, router, roles, pricing, failover. |
| 05-model-knowledge-spec.md | ModelKnowledge: the sanctioned cross-run claim store, card rendering, phases 1-3. |
| 06-execution-spec.md | Execution: canonical Ctx interface, scheduler, three-layer budget, UsageLimits, runners, engine API, consolidated defaults table. |
| 07-adaptive-orchestration-spec.md | Adaptive orchestration: PlanRunner, orchestrator toolset, WakeDigest, escalation, admission, lineage, RunLedger, ModelLadder, termination. |
| 08-tools-permissions-spec.md | Tools, SchemaSpec, permission chain, presets, MCP bus, executors, isolation and worktrees. |
| 09-observability-testing-spec.md | Event stream, metrics, OTel, RunHandle and CostReport, test harness tiers, defect cassette catalog, evals, redaction. |
| 10-implementation-plan.md | Milestones M0-M12 with the 1:1 version map, per-milestone tasks Mx-Tyy, definitions of done. |
| 11-testing-strategy.md | Test pyramid: unit, store conformance, frozen fixtures, cassettes, replay-strict, eval CI, per-milestone exit criteria. |
| 12-release-versioning.md | Lockstep semver policy, changesets fixed mode, hashVersion release discipline, the 1.0 gate, release pipeline. |
| 13-toolchain-repo.md | Committed toolchain with rationale, repo layout, package templates, the canonical naming risk note, risk register. |
| 14-open-questions.md | OQ register: open engineering questions, founder-only decisions, change process. |

## 3. Reading order

Full order for a first complete pass: 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14. Readers implementing v1 scope MAY defer 05-model-knowledge-spec.md until milestone M10, since ModelKnowledge ships post-1.0; its SPI seam placement still appears in 02-architecture.md.

Role-based shortcuts:

| Role | Read |
|---|---|
| Journal kernel author | 00, 01, 02, 03, 11 |
| Provider adapter author | 00, 02, 04, 09, 11 |
| Orchestration author | 00, 02, 03, 06, 07 |
| Ops and shell author | 00, 02, 06, 09, 12, 13 |

## 4. Conventions

- Normative language uses RFC 2119 keywords: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY. Statements without these keywords are informative.
- ASCII hyphen "-" (U+002D) only. The em dash (U+2014), en dash (U+2013), and the look-alikes U+2010, U+2011, U+2012, and U+2212 are forbidden everywhere in this documentation set. Emojis are forbidden everywhere.
- Markdown: exactly one H1 per file; sentence-case headings; fenced `ts` code blocks for API sketches; tables only for enumerable facts.
- Every file starts with the header block: title, "Status: Ready for implementation", "Version: 0.2.0-docs", date, and a one-line purpose.
- Cross-references cite other docs by relative path plus section heading, for example: see 03-journal-spec.md, section "Replay predicate".
- Requirements are cited only by ID (FR-xxx, NFR-xx); the statements live solely in 01-requirements.md.

## 5. Shared ID schemes

| Scheme | Form | Meaning | Owning registry |
|---|---|---|---|
| Functional requirement | FR-xxx | Three digits, allocated in hundred-blocks by area (FR-0xx journal/durability, FR-1xx model layer, FR-2xx execution, FR-3xx adaptive orchestration, FR-4xx tools/permissions/isolation/MCP, FR-5xx observability/testing/evals, FR-6xx ModelKnowledge, FR-7xx shells) | 01-requirements.md |
| Non-functional requirement | NFR-xx | Two digits, one global sequence | 01-requirements.md |
| Invariant | I1-I6, then I7+ | Load-bearing invariants; I1-I6 numbering is fixed, extensions continue at I7+ | 00-overview.md |
| Milestone | M0-M12 | Each maps 1:1 to a lockstep version | 10-implementation-plan.md |
| Task | Mx-Tyy | Two-digit zero-padded, allocated in dependency order within a milestone | 10-implementation-plan.md |
| Defect fix | DEF-1 to DEF-8 | Normative content folded in from the eight defect-fix specifications; every folded rule carries its (DEF-n) marker | folded across 03, 06, 07, 08, 09 |
| Cross-review amendment | XF-01 to XF-12 | The twelve cross-review amendments | mapping table in 07-adaptive-orchestration-spec.md, section "Cross-fix mapping" |
| Open question | OQ-nn | Open questions with owner and closing milestone | 14-open-questions.md |
| Exclusion | EXC-nn | Explicit not-in-v1 exclusions | 01-requirements.md |
| Hypothesis | H-xx | Dogfood telemetry hypotheses (for example H-OrchShare) | 01-requirements.md |

IDs are permanent: they are never renumbered and never reused. A withdrawn requirement keeps its ID with status Withdrawn. A task moved between milestones gets a new ID with a cross-note.

## 6. Docs versioning and amendment process

- The set is versioned as a whole; every file carries the same "Version: 0.2.0-docs" until a set-wide amendment bumps it.
- Spec-first rule: any deviation from the invariants I1-I6, the replay predicate, the three kernel amendments (DEF-1), the hashVersion discipline (DEF-6), or any other normative MUST statement REQUIRES an explicit amendment to the affected doc, merged before the code change lands.
- Amendments that close an open question MUST update both the owning spec section and the register in 14-open-questions.md (see 14-open-questions.md, section "Change process").
- New invariants MUST continue the numbering at I7 and MAY be added only by amending 00-overview.md.
- All ID registries are append-only.

## 7. License

License: TBD (decided before first public release). No file in this documentation set contains license text. The decision is tracked as OQ-23 in 14-open-questions.md and is a 1.0 release gate per 12-release-versioning.md, section "The 1.0 gate".

## 8. Naming status

The library is named lurker; all packages publish under the @lurker scope as @lurker/<name>, with "lurker" planned as the umbrella package. The unscoped npm name is currently occupied and the umbrella name is contingent; install commands in these docs always use @lurker/<name> and never bare "lurker". The canonical naming risk note lives in 13-toolchain-repo.md, section "Naming risk note"; the open contingency is tracked as OQ-24 in 14-open-questions.md.
## 9. Amendment log

| Docs version | Date | Summary |
|---|---|---|
| 0.2.0-docs | 2026-07-06 | Pre-implementation readiness amendment: declared the model-spec family (ModelSpec, ModelChoice, CanonicalModelSpec, CanonicalLadderSpec), ToolContract, JsonSchema, and ModelRetry; made the docs/04 LadderSpec block the single ladder declaration; committed explicit changesets enumeration and the pnpm pin selection rule; added interim rules for the remaining Appendix A TBD knobs; added the CompiledWorkflow delivery note and the ModelKnowledgeStore timing clarification; exact section-name citations. |
| 0.1.0-docs | 2026-07-06 | Initial consolidated documentation set. |
