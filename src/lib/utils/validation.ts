// Input validation — ported from InputValidator.kt

export const MAX_NAME_LENGTH = 20;

/**
 * Sanitize a player name: strip control characters, RTL/LTR overrides,
 * zero-width characters, and enforce max length. Emoji and international
 * characters are preserved.
 */
export function sanitizeName(input: string): string {
	// Remove control chars (C0, C1), format chars (zero-width joiners, RTL/LTR overrides),
	// private use, and unassigned codepoints.
	// Keep letters, numbers, symbols, punctuation, spaces, and emoji.
	let filtered = '';
	for (const char of input) {
		const cp = char.codePointAt(0)!;
		// Skip control characters (0x00-0x1F, 0x7F-0x9F)
		if (cp <= 0x1F || (cp >= 0x7F && cp <= 0x9F)) continue;
		// Skip format characters (category Cf): zero-width spaces, RTL/LTR marks, etc.
		if (isFormatChar(cp)) continue;
		filtered += char;
	}

	// Limit by codepoint count (not UTF-16 length) to handle surrogate pairs
	const codepoints = [...filtered];
	return codepoints.slice(0, MAX_NAME_LENGTH).join('');
}

function isFormatChar(cp: number): boolean {
	// Common format characters to filter:
	// Soft hyphen, zero-width space, zero-width non-joiner, zero-width joiner,
	// LTR/RTL marks, LTR/RTL embedding/override/isolate, pop directional
	const formatCodepoints = [
		0x00AD, // Soft hyphen
		0x200B, // Zero width space
		0x200C, // Zero width non-joiner
		0x200D, // Zero width joiner
		0x200E, // LTR mark
		0x200F, // RTL mark
		0x202A, // LTR embedding
		0x202B, // RTL embedding
		0x202C, // Pop directional formatting
		0x202D, // LTR override
		0x202E, // RTL override
		0x2060, // Word joiner
		0x2066, // LTR isolate
		0x2067, // RTL isolate
		0x2068, // First strong isolate
		0x2069, // Pop directional isolate
		0xFEFF, // BOM / zero width no-break space
	];
	return formatCodepoints.includes(cp);
}
