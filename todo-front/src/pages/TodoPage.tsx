import { useEffect, useState } from 'react'
import { LoaderCircleIcon, PencilIcon, Trash2Icon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTodoStore } from '@/stores/todoStore'

export function TodoPage() {
  const { todos, loading, error, fetchTodos, createTodo, updateTodo, toggleTodo, deleteTodo } =
    useTodoStore()

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: number; title: string; description: string }>({
    id: 0,
    title: '',
    description: '',
  })

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const handleCreate = async () => {
    const title = newTitle.trim()
    if (!title) return
    await createTodo({ title, description: newDescription.trim() })
    setNewTitle('')
    setNewDescription('')
  }

  const handleEdit = (todo: (typeof todos)[number]) => {
    setEditTarget({ id: todo.id, title: todo.title, description: todo.description })
    setEditDialogOpen(true)
  }

  const handleEditSave = async () => {
    if (!editTarget.title.trim()) return
    await updateTodo(editTarget.id, {
      title: editTarget.title.trim(),
      description: editTarget.description.trim(),
    })
    setEditDialogOpen(false)
  }

  const handleDelete = async (id: number) => {
    await deleteTodo(id)
  }

  const handleToggle = async (id: number) => {
    await toggleTodo(id)
  }

  if (loading && todos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 新增表单 */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Input
          placeholder="输入待办标题..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && newTitle.trim()) {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
        <Textarea
          placeholder="描述（可选）"
          rows={2}
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!newTitle.trim()}
            onClick={handleCreate}
          >
            <PlusIcon className="size-4" />
            新增
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Todo 列表 */}
      {todos.length === 0 && !loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          暂无待办事项，点击上方新增开始使用
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className="group flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/30"
            >
              <div className="pt-0.5">
                <Checkbox
                  checked={todo.completed === 1}
                  onCheckedChange={() => handleToggle(todo.id)}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-medium ${
                    todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                  }`}
                >
                  {todo.title}
                </div>
                {todo.description && (
                  <div
                    className={`mt-1 text-xs ${
                      todo.completed ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground'
                    }`}
                  >
                    {todo.description}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-[640px]:opacity-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleEdit(todo)}
                >
                  <PencilIcon className="size-3.5" />
                  <span className="sr-only">编辑</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(todo.id)}
                >
                  <Trash2Icon className="size-3.5 text-destructive" />
                  <span className="sr-only">删除</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑待办</DialogTitle>
            <DialogDescription>修改待办的标题和描述</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="标题"
              value={editTarget.title}
              onChange={(e) =>
                setEditTarget((prev) => ({ ...prev, title: e.target.value }))
              }
            />
            <Textarea
              placeholder="描述（可选）"
              rows={3}
              value={editTarget.description}
              onChange={(e) =>
                setEditTarget((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={!editTarget.title.trim()}
              onClick={handleEditSave}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
