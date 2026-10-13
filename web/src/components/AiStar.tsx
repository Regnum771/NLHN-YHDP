// The AI mark: two four-point stars (handover/06-screens.md, path from mock/Main.dc.html). It marks
// what the tutor or a model proposed, and is used nowhere else. Decorative: the text beside it says what it is.
export function AiStar({ size = 20, onDark = false }: { size?: number; onDark?: boolean }) {
  const fill = onDark ? 'var(--ai-gold-on-dark)' : 'var(--ai-gold)'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ flexShrink: 0 }}>
      <path d="M10 2c.6 4.4 3.6 7.4 8 8-4.4.6-7.4 3.6-8 8-.6-4.4-3.6-7.4-8-8 4.4-.6 7.4-3.6 8-8z" fill={fill} />
      <path d="M19 14c.3 2 1.3 3 3 3.3-1.7.3-2.7 1.3-3 3.3-.3-2-1.3-3-3-3.3 1.7-.3 2.7-1.3 3-3.3z" fill={fill} />
    </svg>
  )
}
