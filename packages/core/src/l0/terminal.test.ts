/**
 * The terminal sanitizer (v1.21.0 review P2-1): a malicious-strings
 * table run through one function, asserting the safety property (no C0,
 * DEL, or C1 byte and no ESC-initiated sequence survive) while visible
 * text is preserved.
 */
import { describe, expect, it } from 'vitest';

import { sanitizeTerminalText } from './terminal.js';

const ESC = String.fromCharCode(0x1b);
const BEL = String.fromCharCode(0x07);
const ST = ESC + '\\';
const C1_CSI = String.fromCharCode(0x9b);
const C1_OSC = String.fromCharCode(0x9d);
const C1_DCS = String.fromCharCode(0x90);

/** True when no byte is C0 (except none allowed), DEL, or C1. */
function hasControlByte(s: string): boolean {
  return [...s].some((c) => {
    const n = c.charCodeAt(0);
    return n <= 0x1f || (n >= 0x7f && n <= 0x9f);
  });
}

describe('sanitizeTerminalText', () => {
  it('is the identity on clean text', () => {
    const clean = 'openai:gpt-5.6-terra (worker) $0.0042 in 8.2k out 1.1k';
    expect(sanitizeTerminalText(clean)).toBe(clean);
  });

  const MALICIOUS: Array<[string, string]> = [
    ['CR', `a${String.fromCharCode(0x0d)}b`],
    ['LF', 'a\nb'],
    ['TAB', `a${String.fromCharCode(0x09)}b`],
    ['NUL', `a${String.fromCharCode(0x00)}b`],
    ['DEL', `a${String.fromCharCode(0x7f)}b`],
    ['7-bit CSI clear screen', `safe${ESC}[2Jmid`],
    ['7-bit SGR color', `safe${ESC}[31mred${ESC}[0m`],
    ['8-bit C1 CSI', `safe${C1_CSI}2Jmid`],
    ['OSC set title (BEL)', `safe${ESC}]0;pwned title${BEL}mid`],
    ['OSC set title (ST)', `safe${ESC}]0;pwned${ST}mid`],
    ['8-bit C1 OSC', `safe${C1_OSC}0;pwned${BEL}mid`],
    ['OSC clipboard payload', `x${ESC}]52;c;ZXZpbA==${ST}y`],
    ['DCS payload', `x${ESC}Pq#0;1;2${ST}y`],
    ['8-bit DCS', `x${C1_DCS}payload${ST}y`],
    ['unterminated OSC', `x${ESC}]0;no terminator here`],
    ['lone ESC', `x${ESC}y`],
    ['bare C1 range byte', `x${String.fromCharCode(0x85)}y`],
  ];

  it.each(MALICIOUS)('neutralizes %s', (_name, input) => {
    const out = sanitizeTerminalText(input);
    // The safety property: nothing in C0, DEL, or C1 survives, and no
    // raw ESC or 8-bit introducer remains.
    expect(hasControlByte(out)).toBe(false);
    expect(out).not.toContain(ESC);
    expect(out).not.toContain(C1_CSI);
    expect(out).not.toContain(C1_OSC);
    // A single physical line: no injected newline.
    expect(out.split('\n')).toHaveLength(1);
  });

  it('preserves the visible payload around a stripped sequence', () => {
    expect(sanitizeTerminalText(`before${ESC}[2Jafter`)).toBe('beforeafter');
    expect(sanitizeTerminalText(`before${ESC}]0;title${BEL}after`)).toBe('beforeafter');
    // A control run between visible text collapses to one space.
    expect(sanitizeTerminalText('a\n\r\tb')).toBe('a b');
  });

  it('leaves the printable remainder of an unterminated sequence as inert text', () => {
    const out = sanitizeTerminalText(`x${ESC}]0;no end`);
    expect(out).not.toContain(ESC);
    expect(hasControlByte(out)).toBe(false);
    expect(out).toContain('no end');
  });
});
