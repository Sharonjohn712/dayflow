import { verifyToken } from '@clerk/backend'
import type { MiddlewareHandler } from 'hono'

// Augment Hono's context Variables type
declare module 'hono' {
  interface ContextVariableMap {
    userId: string
  }
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
      jwtKey: process.env.CLERK_JWT_KEY,
    })
    c.set('userId', payload.sub)
    await next()
  } catch (err) {
    console.error('[auth] token verification failed:', err)
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
}
