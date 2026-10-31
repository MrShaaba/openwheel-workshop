export type Easing = (t: number) => number

export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3)

export const easeInCubic: Easing = (t) => t * t * t

export const easeInOutSine: Easing = (t) => -(Math.cos(Math.PI * t) - 1) / 2

export const easeOutQuint: Easing = (t) => 1 - Math.pow(1 - t, 5)

/** Overshoots slightly past the target and settles. */
export const easeOutBack: Easing = (t) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Springy settle used for the magnetic snap at the end of a fly-in. */
export const easeOutElastic: Easing = (t) => {
  if (t === 0 || t === 1) return t
  const c4 = (2 * Math.PI) / 3
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
}
