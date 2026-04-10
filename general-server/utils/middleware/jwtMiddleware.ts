import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { HttpStatus } from '../constant/HttpStatus.ts'

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key'

export interface JwtPayload {
  [key: string]: any
}

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload
    }
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  if (process.env.JWT_ENABLED !== 'true') {
    return next()
  }

  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(HttpStatus.UNAUTHORIZED).sendFail('缺少授权信息或授权格式错误', HttpStatus.UNAUTHORIZED)
  }

  const token = authHeader.slice(7)
  try {
    req.jwtPayload = jwt.verify(token, JWT_SECRET) as JwtPayload
    next()
  } catch {
    return res.status(HttpStatus.UNAUTHORIZED).sendFail('令牌无效或已过期', HttpStatus.UNAUTHORIZED)
  }
}

export function generateToken(payload: JwtPayload, expiresIn: number = 7200): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}
