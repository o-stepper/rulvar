// Vendored from @cfworker/json-schema@4.1.1 (MIT), file src/pointer.ts.
// Upstream: https://github.com/cfworker/cfworker (packages/json-schema).
// Provenance, license, supported subset, and local edits: ./README.md
// (docs/08-tools-permissions-spec.md, section "SchemaSpec"; task M0-T08).

export function encodePointer(p: string): string {
  return encodeURI(escapePointer(p));
}

export function escapePointer(p: string): string {
  return p.replace(/~/g, '~0').replace(/\//g, '~1');
}
