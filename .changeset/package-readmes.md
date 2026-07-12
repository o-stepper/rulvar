---
'@rulvar/anthropic': patch
'@rulvar/bridge-ai-sdk': patch
'@rulvar/cli': patch
'@rulvar/core': patch
'@rulvar/evals': patch
'@rulvar/rulvar': patch
'@rulvar/openai': patch
'@rulvar/plan': patch
'@rulvar/planner': patch
'@rulvar/store-conformance': patch
'@rulvar/store-sqlite': patch
'@rulvar/testing': patch
'eslint-plugin-rulvar': patch
---

Every published package now ships a README, so its npm page states what the package is, how it installs, and where the documentation lives (npm includes README.md in the tarball regardless of the files allowlist, so no manifest changes are involved; @rulvar/compat gains its README on its own next release). Alongside, the repository-level pages are refreshed to the current project state: the root README is rewritten around the never-pay-twice pitch with a runnable quickstart condensation and the full package table, CONTRIBUTING.md lists the complete PR gate set, the examples README drops retired-spec citations for live docs.rulvar.com links and documents the dogfood journal replay, and the pointer README gets the same treatment.
