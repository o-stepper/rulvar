/**
 * The journal append JSON-serializability check (M1-T04): every journaled
 * value MUST be JSON-serializable; a violation raises a typed
 * NonSerializableValueError at the calling site without journaling
 * anything.
 */
import { NonSerializableValueError } from '../l0/errors.js';
import type { Json } from '../l0/json.js';

function check(value: unknown, path: string): void {
  if (value === null) {
    return;
  }
  switch (typeof value) {
    case 'boolean':
    case 'string':
      return;
    case 'number': {
      if (!Number.isFinite(value)) {
        throw new NonSerializableValueError(
          `non-finite number at ${path} is not JSON-serializable`,
          { data: { path } },
        );
      }
      return;
    }
    case 'object': {
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i += 1) {
          if (value[i] === undefined) {
            throw new NonSerializableValueError(
              `undefined inside array at ${path}[${i}] is not JSON-serializable`,
              { data: { path: `${path}[${i}]` } },
            );
          }
          check(value[i], `${path}[${i}]`);
        }
        return;
      }
      const proto: unknown = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        throw new NonSerializableValueError(
          `non-plain object (${value.constructor?.name ?? 'unknown prototype'}) at ${path} ` +
            'is not JSON-serializable',
          { data: { path } },
        );
      }
      for (const [key, member] of Object.entries(value as Record<string, unknown>)) {
        if (member === undefined) {
          continue; // JSON.stringify drops undefined members; so does the journal.
        }
        check(member, `${path}.${key}`);
      }
      return;
    }
    default:
      throw new NonSerializableValueError(
        `value of type ${typeof value} at ${path} is not JSON-serializable`,
        { data: { path } },
      );
  }
}

/**
 * Validates and snapshots a value for the journal: the returned value is a
 * JSON round-trip clone, decoupled from later caller mutations, with
 * undefined object members dropped.
 */
export function toJournalValue(value: unknown, site: string): Json {
  check(value, site);
  return JSON.parse(JSON.stringify(value)) as Json;
}
