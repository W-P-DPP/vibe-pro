export interface CreateTodoReq {
  title: string
  description?: string
}

export interface UpdateTodoReq {
  title?: string
  description?: string
}

export interface TodoResp {
  id: number
  title: string
  description: string
  completed: number
  createTime?: string
  updateTime?: string
}

export type TodoListResp = TodoResp[]

export interface TodoValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}
