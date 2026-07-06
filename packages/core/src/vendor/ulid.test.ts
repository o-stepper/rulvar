import { describe, expect, it } from 'vitest';

import { decodeTime, monotonicUlidFactory } from './ulid.js';

const CROCKFORD = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{26}$/;

describe('monotonicUlidFactory', () => {
  it('mints 26-character Crockford base32 ids', () => {
    const ulid = monotonicUlidFactory();
    for (let i = 0; i < 100; i++) {
      expect(ulid()).toMatch(CROCKFORD);
    }
  });

  it('round-trips the timestamp through decodeTime', () => {
    const time = 1751790000000;
    const ulid = monotonicUlidFactory({ now: () => time });
    expect(decodeTime(ulid())).toBe(time);
  });

  it('produces strictly sorted ids within one millisecond (M0-T08 acceptance)', () => {
    const ulid = monotonicUlidFactory({ now: () => 1751790000000 });
    const ids = Array.from({ length: 1000 }, () => ulid());
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < ids.length; i++) {
      expect(ids[i] > ids[i - 1]).toBe(true);
    }
  });

  it('increments with a carry across random bytes', () => {
    const bytes = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0xff, 0xff]);
    const ulid = monotonicUlidFactory({
      now: () => 0,
      random: () => bytes.slice(),
    });
    const first = ulid();
    const second = ulid();
    expect(second > first).toBe(true);
    expect(second.slice(0, 10)).toBe(first.slice(0, 10));
  });

  it('throws RangeError when the 80-bit counter overflows', () => {
    const ulid = monotonicUlidFactory({
      now: () => 0,
      random: () => new Uint8Array(10).fill(0xff),
    });
    ulid();
    expect(() => ulid()).toThrow(RangeError);
  });

  it('stays monotonic across a clock regression', () => {
    const times = [5000, 4000, 4500];
    let call = 0;
    const ulid = monotonicUlidFactory({ now: () => times[call++] });
    const a = ulid();
    const b = ulid();
    const c = ulid();
    expect(b > a).toBe(true);
    expect(c > b).toBe(true);
    expect(decodeTime(b)).toBe(5000);
    expect(decodeTime(c)).toBe(5000);
  });

  it('orders ids across advancing milliseconds by timestamp', () => {
    const times = [1000, 2000];
    let call = 0;
    const ulid = monotonicUlidFactory({ now: () => times[call++] });
    const a = ulid();
    const b = ulid();
    expect(b > a).toBe(true);
    expect(decodeTime(a)).toBe(1000);
    expect(decodeTime(b)).toBe(2000);
  });

  it('rejects invalid timestamps and malformed ids', () => {
    expect(() => monotonicUlidFactory({ now: () => -1 })()).toThrow(RangeError);
    expect(() => monotonicUlidFactory({ now: () => 2 ** 48 })()).toThrow(RangeError);
    expect(() => monotonicUlidFactory({ now: () => 1.5 })()).toThrow(RangeError);
    expect(() => decodeTime('short')).toThrow(RangeError);
    expect(() => decodeTime('I'.repeat(26))).toThrow(RangeError);
  });

  it('rejects a random source of the wrong length', () => {
    const ulid = monotonicUlidFactory({ now: () => 0, random: () => new Uint8Array(4) });
    expect(() => ulid()).toThrow(RangeError);
  });

  it('keeps independent state per factory', () => {
    const a = monotonicUlidFactory({ now: () => 1000 });
    const b = monotonicUlidFactory({ now: () => 1000 });
    expect(decodeTime(a())).toBe(1000);
    expect(decodeTime(b())).toBe(1000);
  });
});
