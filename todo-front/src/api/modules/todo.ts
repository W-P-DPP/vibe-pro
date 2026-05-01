import { request } from '../request'

export interface TodoItem {
  id: number
  title: string
  description: string
  completed: number
  createTime?: string
  updateTime?: string
}

export interface CreateTodoParams {
  title: string
  description?: string
}

export interface UpdateTodoParams {
  title?: string
  description?: string
}

export function getTodoList() {
  return request.get<TodoItem[]>('/todo/list')
}

export function createTodo(data: CreateTodoParams) {
  return request.post<TodoItem>('/todo/create', data)
}

export function updateTodo(id: number, data: UpdateTodoParams) {
  return request.put<TodoItem>(`/todo/update/${id}`, data)
}

export function toggleTodo(id: number) {
  return request.put<TodoItem>(`/todo/toggle/${id}`)
}

export function deleteTodo(id: number) {
  return request.delete<TodoItem>(`/todo/delete/${id}`)
}
