---
'@lurker/testing': minor
'@lurker/lurker': minor
'@lurker/core': minor
---

M1-T14/T15: @lurker/testing tier 1 (FakeAdapter matching on
agentType/label/prompt regex with a '*' fallback, honoring the selected
structured-output tier, zero USD by construction; createTestEngine over
the full real engine with recorded event streams; toHaveCalledAgent and
toStayUnderBudget matchers at '@lurker/testing/matchers') and the
completed umbrella (re-exports of @lurker/core and both first-class
adapters, renderProgress, the umbrella-only recommendedDefaults strong
model slots, the M1 exit-criteria example workflow, and the CI install
smoke on packed tarballs). The core now populates the reserved
providerOptions 'lurker' telemetry namespace on every request (docs/04
section 1.8 as amended) and AgentResult carries errorMessage detail for
journaled WireError fidelity.
