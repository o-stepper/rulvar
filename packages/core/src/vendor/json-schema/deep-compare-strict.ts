// Vendored from @cfworker/json-schema@4.1.1 (MIT), file src/deep-compare-strict.ts.
// Upstream: https://github.com/cfworker/cfworker (packages/json-schema).
// Provenance, license, supported subset, and local edits: ./README.md
// (docs/08-tools-permissions-spec.md, section "SchemaSpec"; task M0-T08).

export function deepCompareStrict(a: any, b: any): boolean {
  const typeofa = typeof a;
  if (typeofa !== typeof b) {
    return false;
  }
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) {
      return false;
    }
    const length = a.length;
    if (length !== b.length) {
      return false;
    }
    for (let i = 0; i < length; i++) {
      if (!deepCompareStrict(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  if (typeofa === 'object') {
    if (!a || !b) {
      return a === b;
    }
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    const length = aKeys.length;
    if (length !== bKeys.length) {
      return false;
    }
    for (const k of aKeys) {
      if (!deepCompareStrict(a[k], b[k])) {
        return false;
      }
    }
    return true;
  }
  return a === b;
}
