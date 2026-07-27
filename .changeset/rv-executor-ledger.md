---
'@rulvar/executor': patch
'@rulvar/core': patch
---

The side-effect ledger records the outcome a dispatch actually had: a tool whose stdout violates the result protocol (non-JSON output from a clean exit) now ledgers `error` instead of `ok`, in both the subprocess and container executors, and the executor conformance kit pins it as check e12. In `@rulvar/core`, `stripFencedBlocks` closes fences in CRLF text (a trailing carriage return no longer keeps a fence open and swallows the rest of the document), which `fencedCode: 'excluded'` validators and `headingStructureValidator` inherit. Docs drift closed alongside: the package count, tables, and dependency graphs catch up to `@rulvar/executor` and `@rulvar/store-postgres`, the durability page reflects the shipped data protection hooks instead of denying them, and the architecture page no longer claims only the in-process executor exists.
