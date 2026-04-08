import type { ErrorHandler } from 'hono'
import { ZodError } from 'zod'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(err)

  if (err instanceof ZodError) {
    return c.json(
      { error: 'Validation error', details: err.flatten().fieldErrors },
      400
    )
  }

  return c.json(
    { error: err.message ?? 'Internal server error' },
    500
  )
}
