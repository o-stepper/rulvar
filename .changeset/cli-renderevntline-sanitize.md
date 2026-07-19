---
'@rulvar/cli': patch
---

Sanitize the CLI event line renderer (`renderEventLine`, used by `attachProgress`): every composed line passes through the shared `sanitizeTerminalText` before it reaches the terminal, so an untrusted provider/tool/log string in an event can no longer inject a control sequence or a second physical line into CLI output (v1.21.0 review P2-1). Clean lines stay byte-identical.
