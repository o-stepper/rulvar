/**
 * Terminal output hygiene (v1.21.0 review P2-1): the rendering-boundary
 * counterpart to maskSecrets. Any UNTRUSTED string a terminal renderer
 * interpolates into a line, provider error messages, tool names, model
 * ids, workflow and label metadata, and log text, can carry control
 * characters and escape sequences that rewrite the screen, recolor to
 * hide forged text, set the window title, drive the clipboard on some
 * terminals, or inject fresh newlines that forge CI log structure.
 * Secret masking does not address this: it targets credential SHAPES,
 * not control bytes.
 *
 * Every line-oriented renderer passes each dynamic value through
 * `sanitizeTerminalText` BEFORE interpolation, and adds its own SGR
 * styling only afterward, so the renderer's own colors survive while
 * nothing an adapter or tool emitted can reach the terminal as a control
 * sequence. The guarantee after sanitization: the result contains no
 * byte in `U+0000..U+001F`, `U+007F..U+009F` (C0, DEL, and the C1 range
 * including every 8-bit sequence introducer), and no ESC-initiated
 * CSI/OSC/DCS/SOS/PM/APC sequence.
 *
 * The patterns are built from escaped codepoints (never literal control
 * bytes in the source) and applied in order: string sequences first (so
 * their printable payload leaves with them), then CSI, then any
 * remaining control run collapses to one space. An unterminated or
 * partial sequence loses its introducer in the final pass, which
 * de-fangs it.
 */

// Matching control codepoints is the whole point of a sanitizer, so the
// control-regex rule is disabled across the three patterns.
/* eslint-disable no-control-regex */

// OSC/DCS/SOS/PM/APC: 7-bit intro (ESC then ] P X ^ _) or an 8-bit C1
// introducer, terminated by BEL or ST (ESC \ or U+009C).
const ESC_STRING_SEQUENCE = new RegExp(
  '(?:\\u001B[\\]PX^_]|[\\u009D\\u0090\\u0098\\u009E\\u009F])[\\s\\S]*?(?:\\u0007|\\u001B\\\\|\\u009C)',
  'gu',
);

// CSI: 7-bit (ESC [) or 8-bit C1 CSI (U+009B), parameter bytes,
// intermediate bytes, one final byte.
const ESC_CSI_SEQUENCE = new RegExp(
  '(?:\\u001B\\[|\\u009B)[\\u0030-\\u003F]*[\\u0020-\\u002F]*[\\u0040-\\u007E]',
  'gu',
);

// C0, DEL, and the whole C1 range.
const CONTROL_RUN = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]+', 'gu');

/* eslint-enable no-control-regex */

/**
 * Neutralizes terminal control sequences and control characters in one
 * untrusted string, collapsing each remaining control run to a single
 * space so a value can never inject a newline, an escape sequence, or a
 * hidden byte into a rendered line. Visible text is preserved.
 */
export function sanitizeTerminalText(text: string): string {
  return text
    .replace(ESC_STRING_SEQUENCE, '')
    .replace(ESC_CSI_SEQUENCE, '')
    .replace(CONTROL_RUN, ' ');
}
