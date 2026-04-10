// src/utils/response.ts

export function success<T>(data: T, msg = '成功'): ResultVO<T> {
  return {
    code: 200,
    msg,
    data,
    timestamp: Date.now(),
  }
}

export function fail(msg = '失败', code = 500, data?: any): ResultVO {
  return {
    code,
    msg,
    data,
    timestamp: Date.now(),
  }
}
