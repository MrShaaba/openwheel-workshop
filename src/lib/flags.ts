/**
 * Stretch goals ship behind build-time flags, so the default build is exactly the workshop.
 * Vite inlines `import.meta.env.VITE_*` at build time; a flag that is off leaves no code path behind.
 */
const enabled = (value: string | undefined): boolean => value === 'true' || value === '1'

/** `VITE_ENABLE_TEST_DRIVE=true` adds the Drive button, the `D` key and the test-drive scene. */
export const TEST_DRIVE_ENABLED = enabled(import.meta.env.VITE_ENABLE_TEST_DRIVE)
