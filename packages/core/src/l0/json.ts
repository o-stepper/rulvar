/**
 * L0 JSON value domain.
 *
 * Everything that enters the journal (entry values, error data, artifacts)
 * MUST be JSON-serializable; `Json` is the type-level face of that rule.
 */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** L0 byte-blob alias consumed by TranscriptStore and IsolationProvider. */
export type Bytes = Uint8Array;
