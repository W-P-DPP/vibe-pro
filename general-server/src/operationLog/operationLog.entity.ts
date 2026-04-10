import { EntitySchema } from 'typeorm'
import dayjs from 'dayjs'

export interface OperationLog {
  id: number
  user: string | undefined
  module: string | undefined
  operationType: string | undefined
  requestUrl: string | undefined
  requestMethod: string | undefined
  requestParams: string | undefined
  ip: string | undefined
  status: string | undefined
  responseCode: number | undefined
  costTime: number | undefined
  createTime: Date
}

export const OperationLogEntity = new EntitySchema<OperationLog>({
  name: 'OperationLog',
  tableName: 'sys_operation_log',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
      comment: '主键',
    },
    user: {
      name: 'user',
      type: String,
      length: 64,
      nullable: true,
      comment: '操作用户',
    },
    module: {
      name: 'module',
      type: String,
      length: 64,
      nullable: true,
      comment: '操作模块',
    },
    operationType: {
      name: 'operation_type',
      type: String,
      length: 32,
      nullable: true,
      comment: '操作类型',
    },
    requestUrl: {
      name: 'request_url',
      type: String,
      length: 512,
      nullable: true,
      comment: '请求URL',
    },
    requestMethod: {
      name: 'request_method',
      type: String,
      length: 16,
      nullable: true,
      comment: 'HTTP方法',
    },
    requestParams: {
      name: 'request_params',
      type: 'text',
      nullable: true,
      comment: '请求参数',
    },
    ip: {
      name: 'ip',
      type: String,
      length: 64,
      nullable: true,
      comment: '客户端IP',
    },
    status: {
      name: 'status',
      type: String,
      length: 16,
      nullable: true,
      comment: '操作结果(success/fail)',
    },
    responseCode: {
      name: 'response_code',
      type: Number,
      nullable: true,
      comment: '响应状态码',
    },
    costTime: {
      name: 'cost_time',
      type: Number,
      nullable: true,
      comment: '耗时(ms)',
    },
    createTime: {
      name: 'create_time',
      type: 'datetime',
      createDate: true,
      comment: '操作时间',
      transformer: {
        from(value?: Date) {
          return value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : null
        },
        to(value?: Date) {
          return value
        },
      },
    },
  },
})
