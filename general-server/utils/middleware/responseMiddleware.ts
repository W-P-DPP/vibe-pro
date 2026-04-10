// src/middleware/responseMiddleware.ts
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Response {
      sendSuccess: <T>(data?: T, msg?: string) => void
      sendFail: (msg?: string, code?: number) => void
    }
  }
}

export function responseMiddleware(req: Request, res: Response, next: NextFunction) {
  res.sendSuccess = function <T>(data: T, msg?: string) {
    const result: ResultVO<T> = {
      code: 200,
      msg: msg || '成功',
      data,
      timestamp: Date.now()
    }
    res.json(result)
  }

  res.sendFail = function (msg?: string, code?: number) {
    const result: ResultVO = {
      code: code || 500,
      msg: msg || '失败',
      timestamp: Date.now()
    }
    res.json(result)
  }

  next()
}
