---
'@rulvar/core': minor
---

The downloaded billing export parses fail-closed (RV2908). `statementRowsFromDelimited(text, { delimiter? })` turns the CSV/TSV a provider console hands a host into the header-keyed rows `statementFromRows` consumes, closing the last manual step between a downloaded export and `reconcileStatement`. The library still hard-codes no provider's format: the host owns the column map, this owns only the strict delimited grammar (RFC 4180 quoting, CRLF or LF records, one trailing newline ignored). A ragged record, a torn quote, a stray quote in an unquoted cell, and an empty or duplicated header name each refuse typed with their line, because a column shifted one to the left prices outputTokens as dollars and calls it evidence.
