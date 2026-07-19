---
'@rulvar/cli': patch
---

CLI diagnostics stop echoing `--args` values and sanitize every dynamic value they embed. The invalid-JSON and non-canonical-JSON refusals now name the failure class and the way out without repeating the supplied value (workflow args may carry private data, and stderr routinely lands in CI logs). Every typed CLI error prints through one site that strips terminal control sequences, and the plain-output run renderers (outcome reports, dry-run previews, suspension prompts, resume warnings, plan lint diagnostics) sanitize untrusted text the same way the live TUI already does, so a hostile runId, suspension key, provider error message, or model ref cannot recolor, retitle, or rewrite the terminal. Exit semantics are unchanged.
