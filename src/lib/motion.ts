/** True when the OS asks for reduced motion. Read live so a settings change applies on the next frame. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
