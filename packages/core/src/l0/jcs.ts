/**
 * RFC 8785 (JSON Canonicalization Scheme) serializer.
 *
 * Backs content-key derivation and schema hashing:
 * lexicographically sorted object members (UTF-16 code units), minimal
 * escaping, no insignificant whitespace, ECMAScript number formatting.
 *
 * String and number serialization delegate to JSON.stringify, which RFC
 * 8785 defines as the reference behavior for both. Object members with
 * undefined values are omitted (identity fields "participate as absent
 * when absent"); undefined inside arrays is an error rather than a silent
 * null. Not part of the public package surface: consumers reach it through
 * canonicalizeSchema/schemaHash/toolsetHash and the journal identity path.
 */
export function jcsSerialize(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number': {
      if (!Number.isFinite(value)) {
        throw new Error('JCS: non-finite numbers are not JSON');
      }
      return JSON.stringify(value);
    }
    case 'string':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        const items = value.map((element) => {
          if (element === undefined) {
            throw new Error('JCS: undefined is not permitted inside arrays');
          }
          return jcsSerialize(element);
        });
        return `[${items.join(',')}]`;
      }
      const proto: unknown = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        throw new Error('JCS: non-plain objects are not JSON data');
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort();
      const members: string[] = [];
      for (const key of keys) {
        const member = record[key];
        if (member === undefined) {
          continue;
        }
        members.push(`${JSON.stringify(key)}:${jcsSerialize(member)}`);
      }
      return `{${members.join(',')}}`;
    }
    default:
      throw new Error(`JCS: unsupported value type '${typeof value}'`);
  }
}
