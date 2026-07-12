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

Runtime message strings no longer cite the retired internal specification set: error and warning messages, validation issues, and the CLI help text drop the dangling `docs/NN, section ...` references, pointing at https://docs.rulvar.com pages where a pointer earns its place (the CLI help header, tool naming, toolset registries, bare resume). The umbrella package description sheds the naming-contingency note: the unscoped alias is published and owned. Three strings embedded in frozen recordings stay byte-identical on purpose (the no-progress abort reason and two testing-internal recorder strings), as does the byte-locked golden-fold fixture. Test-file comments lose their citations too; test titles are unchanged.
