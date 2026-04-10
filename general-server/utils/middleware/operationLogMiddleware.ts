import type { Request, Response, NextFunction } from 'express'
import config from '../../src/config.ts'
import { getDataSource } from '../mysql.ts'
import { OperationLogEntity } from '../../src/operationLog/operationLog.entity.ts'
import { Logger } from '../index.ts'

const METHOD_TYPE_MAP: Record<string, string> = {
  GET: '查询',
  POST: '新增',
  PUT: '修改',
  PATCH: '修改',
  DELETE: '删除',
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded.join(',') : forwarded
    return raw.split(',')[0]?.trim() ?? 'unknown'
  }
  return req.socket?.remoteAddress ?? 'unknown'
}

function getModule(path: string): string {
  const segments = path.replace(/\?.*$/, '').split('/').filter(Boolean)
  return segments[segments.length - 1] || 'unknown'
}

export function operationLogMiddleware(req: Request, res: Response, next: NextFunction) {
  const cfg = config.operationLog
  if (!cfg?.enabled) {
    return next()
  }

  const whitelist: string[] = cfg.whitelist || []
  const reqPath = req.path

  if (whitelist.some((w: string) => reqPath === w || reqPath.startsWith(w))) {
    return next()
  }

  const startTime = Date.now()

  res.on('finish', () => {
    const costTime = Date.now() - startTime
    const user = req.jwtPayload?.username || req.jwtPayload?.name || req.jwtPayload?.sub || 'anonymous'
    const fullPath = req.originalUrl

    const params = Object.keys(req.body || {}).length > 0
      ? JSON.stringify(req.body)
      : Object.keys(req.query || {}).length > 0
        ? JSON.stringify(req.query)
        : undefined

    const logEntry = {
      user,
      module: getModule(req.path),
      operationType: METHOD_TYPE_MAP[req.method.toUpperCase()] || req.method,
      requestUrl: fullPath,
      requestMethod: req.method.toUpperCase(),
      requestParams: params,
      ip: getClientIp(req),
      status: res.statusCode < 400 ? 'success' : 'fail',
      responseCode: res.statusCode,
      costTime,
    }

    const ds = getDataSource()
    if (!ds || !ds.isInitialized) return

    ds.getRepository(OperationLogEntity)
      .save(logEntry)
      .catch((err) => {
        Logger.getInstance().error('Failed to save operation log:', err)
      })
  })

  next()
}
