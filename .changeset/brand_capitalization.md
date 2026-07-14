---
'@rulvar/anthropic': patch
'@rulvar/bridge-ai-sdk': patch
'@rulvar/cli': patch
'@rulvar/core': patch
'@rulvar/evals': patch
'@rulvar/openai': patch
'@rulvar/plan': patch
'@rulvar/planner': patch
'@rulvar/rulvar': patch
'@rulvar/store-conformance': patch
'@rulvar/store-sqlite': patch
'@rulvar/testing': patch
'eslint-plugin-rulvar': patch
---

Write the product name as Rulvar in prose: package READMEs, npm descriptions, and the
documentation site now capitalize the brand. Identifiers keep their exact casing, so
package names, the `rulvar` binary, `rulvar.config.mjs`, the `.rulvar` store directory,
the `rulvar.*` OTel attributes, and every URL are unchanged. Documentation and metadata
only; no runtime behaviour changes.
