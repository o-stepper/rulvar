---
layout: home
title: Rulvar documentation
titleTemplate: Guides, examples, and API reference

hero:
  name: Rulvar
  text: An embeddable TypeScript engine for multi-agent LLM workflows.
  tagline: "Durable by construction: a completed LLM call is never paid for twice. Three orchestration modes on one runtime, one journal, one budget path. Immutable dollar budgets with a documented overshoot bound, vendor-neutral provider adapters, VCR cassettes for hermetic tests, and ModelKnowledge that remembers which models work in your project. No server, no database, no control plane."
  image:
    light: /logo.svg
    dark: /logo.dark.svg
    alt: Rulvar
  actions:
    - theme: brand
      text: Get started
      link: /guide/quickstart
    - theme: alt
      text: What is Rulvar?
      link: /guide/
    - theme: alt
      text: For LLMs and agents
      link: /guide/llms
    - theme: alt
      text: View on GitHub
      link: https://github.com/o-stepper/rulvar

features:
  - title: Never pay twice
    details: The journal is a content-addressed memoizing log of completed effects. On resume, finished LLM calls replay from disk; inserting a new call costs exactly one live call.
    link: /guide/journal
    linkText: The journal

  - title: Immutable budgets, bounded overshoot
    details: A per-run USD ceiling no API can raise, enforced by projected admission with pre-dispatch reservation, a budget-derived output bound on every turn, and live stream cuts on crossing. The residual overshoot is documented, at most one in-flight turn per concurrent agent; exhaustion returns partial results, never null.
    link: /guide/budgets
    linkText: Budgets and termination

  - title: Three orchestration modes
    details: Human-written scripts, machine-written scripts with lint and self-repair, and a dynamic orchestrator agent - all on the same runtime, journal, and budget path.
    link: /guide/orchestration-modes
    linkText: Orchestration modes

  - title: Vendor neutrality by construction
    details: The core imports no provider SDKs. Anthropic and OpenAI adapters ship first-class, an openaiCompatible factory covers compatible servers, and a bridge wraps any Vercel AI SDK model.
    link: /guide/providers
    linkText: Providers

  - title: Multi-model at every level
    details: Models resolve per invocation, not per agent - call override, agent profile, workflow defaults, engine defaults. Invocation roles route planning, extraction, and summarization to different models.
    link: /guide/model-routing
    linkText: Model routing

  - title: Testable by construction
    details: FakeAdapter, VCR cassettes with secret redaction, replay-strict runs, and vitest matchers make agent workflows testable without a single live call in CI.
    link: /guide/testing
    linkText: Testing

  - title: Observability out of the box
    details: One typed event stream for every model call, tool call, spawn, and budget decision, with OTel export, cost reports, and a queryable run handle.
    link: /guide/observability
    linkText: Observability

  - title: Embeddable first
    details: A library, not a platform - it lives inside your Node.js app. The CLI, HTTP server, and queue worker shells are optional and build strictly on the public API.
    link: /guide/cli
    linkText: Shells

  - title: ModelKnowledge
    details: A per-project knowledge base of model behavior - verified facts, eval evidence, decay, and a rendered knowledge card that teaches orchestrators which models to spawn.
    link: /guide/model-knowledge
    linkText: ModelKnowledge
---

<div style="text-align: center; margin: 2rem 0; opacity: 0.85;">
  <FrameworkBadge />
</div>
