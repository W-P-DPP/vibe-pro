import { create } from 'zustand'
import * as todoApi from '@/api/modules/todo'
import type { TodoItem, CreateTodoParams, UpdateTodoParams } from '@/api/modules/todo'

interface TodoState {
  todos: TodoItem[]
  loading: boolean
  error: string | null
  fetchTodos: () => Promise<void>
  createTodo: (data: CreateTodoParams) => Promise<void>
  updateTodo: (id: number, data: UpdateTodoParams) => Promise<void>
  toggleTodo: (id: number) => Promise<void>
  deleteTodo: (id: number) => Promise<void>
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  loading: false,
  error: null,

  fetchTodos: async () => {
    set({ loading: true, error: null })
    try {
      const res = await todoApi.getTodoList()
      set({ todos: res ?? [], loading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载失败',
        loading: false,
      })
    }
  },

  createTodo: async (data) => {
    try {
      const res = await todoApi.createTodo(data)
      const created = res
      if (created) {
        set((state) => ({ todos: [created, ...state.todos] }))
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '创建失败' })
    }
  },

  updateTodo: async (id, data) => {
    try {
      const res = await todoApi.updateTodo(id, data)
      const updated = res
      if (updated) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? updated : t)),
        }))
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '更新失败' })
    }
  },

  toggleTodo: async (id) => {
    const current = get().todos.find((t) => t.id === id)
    if (!current) return

    // Optimistic update
    set((state) => ({
      todos: state.todos.map((t) =>
        t.id === id ? { ...t, completed: t.completed ? 0 : 1 } : t,
      ),
    }))

    try {
      const res = await todoApi.toggleTodo(id)
      const toggled = res
      if (toggled) {
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? toggled : t)),
        }))
      }
    } catch (err) {
      // Revert on failure
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...t, completed: current.completed } : t,
        ),
        error: err instanceof Error ? err.message : '切换状态失败',
      }))
    }
  },

  deleteTodo: async (id) => {
    try {
      await todoApi.deleteTodo(id)
      set((state) => ({ todos: state.todos.filter((t) => t.id !== id) }))
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '删除失败' })
    }
  },
}))
