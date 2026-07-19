---
'@rulvar/core': minor
---

Add `sanitizeTerminalText`, the rendering-boundary counterpart to `maskSecrets`: it neutralizes terminal control sequences and control characters in one untrusted string so a provider error message, tool name, model id, or log line can never inject a control sequence or a second physical line into a rendered terminal line (v1.21.0 review P2-1). After sanitization the result carries no C0 control, no `DEL`, no C1 byte (including every 8-bit escape-sequence introducer), and no ESC-initiated CSI/OSC/DCS sequence; control runs collapse to a single space and visible text is preserved. The bundled renderers use it internally, and it is exported for host terminal sinks.

Also isolate event-bus subscribers: a throwing `on()` listener (a renderer, a metrics hook) is best-effort telemetry and can no longer propagate out of `emit` to disrupt a paid run; the failure surfaces once as a warn log on the same bus instead (v1.21.0 review follow-up).
