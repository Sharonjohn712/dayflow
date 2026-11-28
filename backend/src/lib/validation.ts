import type { Context } from 'hono'
import type { ZodError } from 'zod'

// Passed as the third argument to zValidator so request validation failures
// use the same body as every other API error: { error: string, details }.
// Without it, zValidator responds { success: false, error: ZodError }, and the
// frontend would show "[object Object]".
export function onInvalid(result: { success: boolean; error?: ZodError }, c: Context) {
  if (!result.success && result.error) {
    return c.json(
      { error: 'Validation error', details: result.error.flatten().fieldErrors },
      400,
    )
  }
}
