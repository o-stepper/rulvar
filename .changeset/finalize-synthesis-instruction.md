---
'@rulvar/core': minor
---

The finalize synthesis invocation now appends a deterministic synthesis instruction (`FINALIZE_SYNTHESIS_INSTRUCTION`, exported) to its request, and a non-truncated empty synthesis falls back to the loop turn's text instead of erasing it. Previously the routed finalize call sent the projected transcript ending at the assistant message with no instruction at all; a real model reads that as a fresh conversation opening, and its greeting unconditionally replaced the loop's correct answer as the schema-free output (reproduced live: a tool loop that had already answered `42` returned `How can I help?`). The instruction is request-only: the durable transcript keeps the raw history, so journal identity, extract input, and replay are untouched, and no recorded fixture moves. The truncated-empty synthesis case stays a bounded `output-truncated` failure. An opt-in live smoke (`RULVAR_LIVE_TESTS=1` plus `OPENAI_API_KEY`) pins the contract on a real provider.
