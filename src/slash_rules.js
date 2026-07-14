export function selectSlashGlyph(memoryChars, shotCount, glyphCursor = 0) {
  const chars = Array.isArray(memoryChars) ? memoryChars : [];
  const empowered = chars.length > 0 && shotCount % 4 === 0;
  if (!empowered) return { char: '墨', empowered: false, nextGlyphCursor: glyphCursor };
  return {
    char: chars[glyphCursor % chars.length],
    empowered: true,
    nextGlyphCursor: glyphCursor + 1,
  };
}
