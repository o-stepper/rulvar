---
'@lurker/core': minor
'@lurker/planner': minor
---

M6-T04: profileCard and the API card. Core gains `profileCard(profiles)`: the one agent vocabulary both orchestration modes speak, feeding the planner prompt (mode b) and spawn_agent agentType guidance (mode c) with IDENTICAL text; pure function of the registry, sorted, byte-stable, rendering only model-agnostic fields (name, description, tool names, taskClass, estCost, escalation opt-in; models are never named). The planner gains `apiCard()`: the byte-stable card teaching exactly the curated 12-global sandbox dialect (schema literals only, tools by profile name, onError throw|null, async budget, no imports, the opts.key repeat rule) with usage patterns distilled from the examples corpus.
