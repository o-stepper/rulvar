---
'@rulvar/core': minor
---

Add the opt in child-result evidence tools get_child_result and read_child_artifact (the v1.40.0 improvement plan, narrow RV-201 slice)

The digest an await returns is a wake signal truncated to 400 characters, so
an evidence-heavy child settles with its findings intact in the journal but
only a snippet in the digest, and until now there was no way for the
orchestrator to fetch the rest. OrchestrateOptions.exposeChildResultTools now
adds two pure read tools. get_child_result pages a settled child's FULL
output (its string or JSON; a failed child's error message, so the
orchestrator can read why it failed), reporting totalChars and hasMore and
clamping maxChars to 20000 per call so one read can never flood the
orchestrator context. read_child_artifact pages a settled child's artifact
content by id: inline data, an offloaded transcript blob decoded as UTF-8, or
a patch's changed-file list.

Both are pure reads of already-durable journal state, so a resume reproduces
them with no new spend. The option is off by default: adding the tools
changes the orchestrator toolset hash by design (exactly like the extension's
plan tools), so a run that does not opt in keeps the default toolset, and
every frozen cassette, unchanged.
