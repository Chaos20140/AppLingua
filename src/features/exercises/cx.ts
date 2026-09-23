/** Klassennamen zusammensetzen (falsy wird ignoriert). */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
