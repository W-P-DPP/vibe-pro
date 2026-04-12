import { MoonStar, RefreshCw, Search, SunMedium } from 'lucide-react'
import { useTheme } from 'next-themes'
import type { ChangeEvent, DragEvent } from 'react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import type { Sheet2JSONOpts, WorkBook, WorkSheet } from 'xlsx'
import { createMovedPath, getPreviewKind, getPreviewTooLargeMessage } from './file-preview'
import {
  getAuthToken,
  redirectToLoginPage,
  shouldRedirectToLogin,
} from './lib/auth-session'
import type {
  ApiResponse,
  ChunkUploadProgressResponse,
  DragState,
  FeedbackState,
  PendingUploadState,
  PreviewState,
  SpreadsheetSheet,
  UploadMode,
  UploadResponse,
} from './file-server-types'
import {
  countTreeNodes,
  countVisibleNodes,
  type FileNode,
  filterTree,
  findNode,
  getFolderPathSet,
  getParentPath,
  reconcileExpandedPaths,
  sortNodes,
} from './file-tree'
import { PreviewPanel } from './preview-panel'
import { TreeNodeList } from './tree-node-list'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '/api'
const CHUNK_UPLOAD_THRESHOLD = 8 * 1024 * 1024
const CHUNK_UPLOAD_SIZE = 2 * 1024 * 1024
const PREVIEW_TOKEN_COOKIE_NAME = 'file_preview_token'

function getClientRelativePath(file: File, mode: UploadMode): string {
  if (mode === 'folder') {
    const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim()
    if (webkitRelativePath) {
      return webkitRelativePath
    }
  }

  return file.name
}

function getAuthHeaders() {
  const headers = new Headers()
  const token = getAuthToken()

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

function buildPreviewUrl(relativePath: string): string {
  return `${API_BASE_URL}/file/preview?targetPath=${encodeURIComponent(relativePath)}`
}

function setPreviewAuthCookie(token?: string | null) {
  if (typeof document === 'undefined') {
    return
  }

  const secureAttribute =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

  if (!token) {
    document.cookie = `${PREVIEW_TOKEN_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax${secureAttribute}`
    return
  }

  document.cookie = `${PREVIEW_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secureAttribute}`
}

function createUploadId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

async function requestJson<T>(pathName: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const headers = getAuthHeaders()
  if (init?.headers) {
    const incoming = new Headers(init.headers)
    incoming.forEach((value, key) => headers.set(key, value))
  }

  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${pathName}`, { ...init, headers })
  if (shouldRedirectToLogin(response.status)) {
    redirectToLoginPage()
    throw new Error('登录状态已失效，请重新登录')
  }

  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.msg || '请求失败')
  }

  return payload
}

async function requestPreview(relativePath: string, signal?: AbortSignal): Promise<Response> {
  const response = await fetch(buildPreviewUrl(relativePath), { headers: getAuthHeaders(), signal })

  if (shouldRedirectToLogin(response.status)) {
    redirectToLoginPage()
    throw new Error('登录状态已失效，请重新登录')
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as ApiResponse<unknown>
      throw new Error(payload.msg || '读取预览失败')
    }

    throw new Error('读取预览失败')
  }

  return response
}

function toSpreadsheetSheets(
  workbook: WorkBook,
  sheetToJson: (sheet: WorkSheet, options: Sheet2JSONOpts) => unknown[][],
): SpreadsheetSheet[] {
  return workbook.SheetNames.slice(0, 3).map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName]
    const matrix = sheetToJson(worksheet, {
      header: 1,
      blankrows: false,
      raw: false,
    }) as unknown[][]

    return {
      name: sheetName,
      rows: matrix.slice(0, 20).map((row) =>
        row.slice(0, 12).map((cell) => (cell == null ? '' : String(cell))),
      ),
    }
  })
}

export default function App() {
  const { resolvedTheme, setTheme } = useTheme()
  const fileUploadInputRef = useRef<HTMLInputElement | null>(null)
  const folderUploadInputRef = useRef<HTMLInputElement | null>(null)
  const previewObjectUrlRef = useRef<string | null>(null)
  const [tree, setTree] = useState<FileNode[]>([])
  const [selectedPath, setSelectedPath] = useState('/')
  const [expandedPaths, setExpandedPaths] = useState<string[]>(['/'])
  const [composingPath, setComposingPath] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [pendingUpload, setPendingUpload] = useState<PendingUploadState>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dragState, setDragState] = useState<DragState>({ sourcePath: null, sourceType: null, dropTargetPath: null })
  const [previewState, setPreviewState] = useState<PreviewState>({ status: 'idle' })

  const deferredSearchKeyword = useDeferredValue(searchKeyword.trim())
  const rootNode = useMemo<FileNode>(() => ({ name: 'file', relativePath: '/', type: 'folder', children: tree }), [tree])
  const selectedNode = useMemo(() => (selectedPath === '/' ? rootNode : findNode(tree, selectedPath) ?? rootNode), [rootNode, selectedPath, tree])
  const activeFolderPath = selectedNode.type === 'folder' ? selectedNode.relativePath : getParentPath(selectedNode.relativePath)
  const treeStats = useMemo(() => countTreeNodes(tree), [tree])
  const visibleTree = useMemo(() => filterTree(tree, deferredSearchKeyword), [deferredSearchKeyword, tree])
  const visibleExpandedPaths = useMemo(() => (deferredSearchKeyword ? Array.from(getFolderPathSet(visibleTree)) : expandedPaths), [deferredSearchKeyword, expandedPaths, visibleTree])
  const visibleNodeCount = useMemo(() => countVisibleNodes(visibleTree), [visibleTree])

  function clearPreviewObjectUrl() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current)
      previewObjectUrlRef.current = null
    }
  }

  function applyTree(data: FileNode[], nextSelectedPath = selectedPath) {
    const nextTree = sortNodes(data)
    const targetPath = nextSelectedPath === '/' || findNode(nextTree, nextSelectedPath) ? nextSelectedPath : '/'
    setTree(nextTree)
    setSelectedPath(targetPath)
    setExpandedPaths((current) => reconcileExpandedPaths(nextTree, current, targetPath))
  }

  async function refreshTree(nextSelectedPath?: string) {
    setLoading(true)
    try {
      applyTree((await requestJson<FileNode[]>('/file/tree')).data, nextSelectedPath)
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : '读取文件树失败' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function loadInitialTree() {
      setLoading(true)
      try {
        const response = await requestJson<FileNode[]>('/file/tree')
        if (!cancelled) {
          const nextTree = sortNodes(response.data)
          setTree(nextTree)
          setSelectedPath('/')
          setExpandedPaths(['/'])
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ type: 'error', text: error instanceof Error ? error.message : '读取文件树失败' })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadInitialTree()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const folderInput = folderUploadInputRef.current
    if (folderInput) {
      folderInput.setAttribute('webkitdirectory', '')
      folderInput.setAttribute('directory', '')
    }

    return () => {
      clearPreviewObjectUrl()
      setPreviewAuthCookie(null)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    clearPreviewObjectUrl()
    setPreviewAuthCookie(null)
    if (selectedNode.type === 'folder') {
      setPreviewState({ status: 'folder', node: selectedNode })
      return () => controller.abort()
    }

    const kind = getPreviewKind(selectedNode)
    const tooLargeMessage = getPreviewTooLargeMessage(selectedNode, kind)
    if (kind === 'unsupported' || tooLargeMessage) {
      setPreviewState({ status: 'unsupported', node: selectedNode, message: tooLargeMessage ?? '当前文件暂不支持在线预览。' })
      return () => controller.abort()
    }

    setPreviewState({ status: 'loading', node: selectedNode, kind })

    if (kind === 'audio' || kind === 'video') {
      void (async () => {
        try {
          const response = await requestPreview(selectedNode.relativePath, controller.signal)
          await response.body?.cancel()

          const token = getAuthToken()
          if (token) {
            setPreviewAuthCookie(token)
          }

          setPreviewState({
            status: 'ready',
            node: selectedNode,
            kind,
            sourceUrl: buildPreviewUrl(selectedNode.relativePath),
          })
        } catch (error) {
          if (!controller.signal.aborted) {
            setPreviewState({
              status: 'error',
              node: selectedNode,
              message: error instanceof Error ? error.message : '读取预览失败',
            })
          }
        }
      })()

      return () => {
        controller.abort()
        setPreviewAuthCookie(null)
      }
    }

    void (async () => {
      try {
        const response = await requestPreview(selectedNode.relativePath, controller.signal)
        if (kind === 'markdown') {
          setPreviewState({ status: 'ready', node: selectedNode, kind, markdown: await response.text() })
          return
        }
        if (kind === 'text') {
          setPreviewState({ status: 'ready', node: selectedNode, kind, text: await response.text() })
          return
        }
        if (kind === 'docx') {
          const mammoth = await import('mammoth')
          const result = await mammoth.convertToHtml({ arrayBuffer: await response.arrayBuffer() })
          setPreviewState({ status: 'ready', node: selectedNode, kind, html: result.value || '<p>当前文档没有可预览内容。</p>' })
          return
        }
        if (kind === 'spreadsheet') {
          const xlsx = await import('xlsx')
          const workbook = xlsx.read(await response.arrayBuffer(), { type: 'array' })
          setPreviewState({
            status: 'ready',
            node: selectedNode,
            kind,
            sheets: toSpreadsheetSheets(
              workbook,
              xlsx.utils.sheet_to_json as (sheet: WorkSheet, options: Sheet2JSONOpts) => unknown[][],
            ),
          })
          return
        }

        const objectUrl = URL.createObjectURL(await response.blob())
        previewObjectUrlRef.current = objectUrl
        setPreviewState({ status: 'ready', node: selectedNode, kind, objectUrl })
      } catch (error) {
        if (!controller.signal.aborted) {
          setPreviewState({ status: 'error', node: selectedNode, message: error instanceof Error ? error.message : '读取预览失败' })
        }
      }
    })()

    return () => controller.abort()
  }, [selectedNode])

  function handleSelect(pathName: string) {
    setSelectedPath(pathName)
    setExpandedPaths((current) => reconcileExpandedPaths(tree, current, pathName))
    if (composingPath && composingPath !== pathName) {
      setComposingPath(null)
      setFolderName('')
    }
  }

  function handleToggleExpand(pathName: string) {
    if (pathName === '/' || deferredSearchKeyword) {
      return
    }

    setExpandedPaths((current) => (current.includes(pathName) ? current.filter((item) => item !== pathName) : [...current, pathName]))
  }

  function handleStartCreateFolder(pathName: string) {
    setSelectedPath(pathName)
    setComposingPath(pathName)
    setFolderName('')
    setExpandedPaths((current) => (current.includes(pathName) ? current : [...current, pathName]))
  }

  async function handleCreateFolder() {
    if (!folderName.trim()) {
      setFeedback({ type: 'error', text: '请先输入文件夹名称' })
      return
    }

    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file/folder', { method: 'POST', body: JSON.stringify({ parentPath: composingPath ?? activeFolderPath, folderName: folderName.trim() }) })
      setFeedback({ type: 'success', text: response.msg })
      setComposingPath(null)
      setFolderName('')
      await refreshTree(response.data.relativePath)
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : '创建文件夹失败' })
    } finally {
      setSubmitting(false)
    }
  }

  function handleStartUpload(pathName: string, mode: UploadMode) {
    setSelectedPath(pathName)
    setPendingUpload({ targetPath: pathName, mode })
    setExpandedPaths((current) => (current.includes(pathName) ? current : [...current, pathName]))
    ;(mode === 'folder' ? folderUploadInputRef.current : fileUploadInputRef.current)?.click()
  }

  function resetUploadInputs() {
    if (fileUploadInputRef.current) fileUploadInputRef.current.value = ''
    if (folderUploadInputRef.current) folderUploadInputRef.current.value = ''
  }

  async function uploadFilesToPath(pathName: string, files: File[], mode: UploadMode) {
    const useBatchChunkUpload = files.length > 1 && files.some((file) => file.size > CHUNK_UPLOAD_THRESHOLD)
    setSubmitting(true)

    try {
      const response =
        files.length === 1 && files[0].size > CHUNK_UPLOAD_THRESHOLD
          ? await uploadSingleFileInChunks(pathName, files[0], mode)
          : useBatchChunkUpload
            ? await uploadFileBatchInChunks(pathName, files, mode)
            : await uploadDirectFiles(pathName, files, mode)

      setFeedback({ type: 'success', text: response.msg })
      await refreshTree(pathName)
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : '上传文件失败' })
    } finally {
      setSubmitting(false)
      setPendingUpload(null)
      resetUploadInputs()
    }
  }

  async function uploadDirectFiles(pathName: string, files: File[], mode: UploadMode) {
    const formData = new FormData()
    formData.append('targetPath', pathName)
    for (const file of files) {
      formData.append('files', file)
      formData.append('relativePaths', getClientRelativePath(file, mode))
    }

    return requestJson<UploadResponse>('/file/upload', { method: 'POST', body: formData })
  }

  async function uploadSingleFileInChunks(pathName: string, file: File, mode: UploadMode) {
    const uploadId = createUploadId()
    const relativePath = getClientRelativePath(file, mode)
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_UPLOAD_SIZE))

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
      const formData = new FormData()
      formData.append('targetPath', pathName)
      formData.append('relativePath', relativePath)
      formData.append('uploadId', uploadId)
      formData.append('chunkIndex', String(chunkIndex))
      formData.append('totalChunks', String(totalChunks))
      formData.append('chunk', file.slice(chunkIndex * CHUNK_UPLOAD_SIZE, Math.min((chunkIndex + 1) * CHUNK_UPLOAD_SIZE, file.size)), file.name)
      const progress = await requestJson<ChunkUploadProgressResponse>('/file/upload/chunk', { method: 'POST', body: formData })
      setFeedback({ type: 'info', text: `正在上传 ${file.name}，分片 ${progress.data.receivedChunks}/${progress.data.totalChunks}` })
    }

    return requestJson<UploadResponse>('/file/upload/chunk/complete', { method: 'POST', body: JSON.stringify({ targetPath: pathName, relativePath, uploadId, totalChunks }) })
  }

  async function uploadFileBatchInChunks(pathName: string, files: File[], mode: UploadMode) {
    const items: Array<{ relativePath: string; uploadId: string; totalChunks: number }> = []

    for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
      const file = files[fileIndex]
      const uploadId = createUploadId()
      const relativePath = getClientRelativePath(file, mode)
      const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_UPLOAD_SIZE))
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const formData = new FormData()
        formData.append('targetPath', pathName)
        formData.append('relativePath', relativePath)
        formData.append('uploadId', uploadId)
        formData.append('chunkIndex', String(chunkIndex))
        formData.append('totalChunks', String(totalChunks))
        formData.append('chunk', file.slice(chunkIndex * CHUNK_UPLOAD_SIZE, Math.min((chunkIndex + 1) * CHUNK_UPLOAD_SIZE, file.size)), file.name)
        const progress = await requestJson<ChunkUploadProgressResponse>('/file/upload/chunk', { method: 'POST', body: formData })
        setFeedback({ type: 'info', text: `正在上传 ${file.name}，分片 ${progress.data.receivedChunks}/${progress.data.totalChunks}，文件 ${fileIndex + 1}/${files.length}` })
      }
      items.push({ relativePath, uploadId, totalChunks })
    }

    return requestJson<UploadResponse>('/file/upload/chunk/complete-batch', { method: 'POST', body: JSON.stringify({ targetPath: pathName, items }) })
  }

  async function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      setPendingUpload(null)
      resetUploadInputs()
      return
    }

    await uploadFilesToPath(pendingUpload?.targetPath ?? activeFolderPath, files, pendingUpload?.mode ?? 'files')
  }

  async function handleDeleteTarget(targetPath: string) {
    if (!window.confirm(`确认将 ${targetPath} 移入 rubbish 吗？`)) {
      return
    }

    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file', { method: 'DELETE', body: JSON.stringify({ targetPath }) })
      setFeedback({ type: 'success', text: `${response.msg}，已移入 rubbish` })
      await refreshTree(getParentPath(targetPath))
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : '删除目标失败' })
    } finally {
      setSubmitting(false)
    }
  }

  function resetDragState() {
    setDragState({ sourcePath: null, sourceType: null, dropTargetPath: null })
  }

  function isValidDropTarget(node: FileNode) {
    if (!dragState.sourcePath || !dragState.sourceType || node.type !== 'folder' || node.relativePath === dragState.sourcePath) {
      return false
    }

    return !(dragState.sourceType === 'folder' && node.relativePath.startsWith(`${dragState.sourcePath}/`))
  }

  function handleDragStart(node: FileNode) {
    if (!submitting && node.relativePath !== '/') {
      setDragState({ sourcePath: node.relativePath, sourceType: node.type, dropTargetPath: null })
    }
  }

  function handleDragOver(node: FileNode, event: DragEvent<HTMLDivElement>) {
    if (dragState.sourcePath && isValidDropTarget(node)) {
      event.preventDefault()
      setDragState((current) => (current.dropTargetPath === node.relativePath ? current : { ...current, dropTargetPath: node.relativePath }))
    }
  }

  async function handleDrop(node: FileNode, event: DragEvent<HTMLDivElement>) {
    if (!dragState.sourcePath || !isValidDropTarget(node)) {
      return
    }

    event.preventDefault()
    const sourcePath = dragState.sourcePath
    const nextSelectedPath = createMovedPath(sourcePath, node.relativePath)
    resetDragState()
    setSubmitting(true)
    try {
      const response = await requestJson<FileNode>('/file/move', { method: 'POST', body: JSON.stringify({ sourcePath, destinationPath: node.relativePath }) })
      setFeedback({ type: 'success', text: response.msg })
      await refreshTree(nextSelectedPath)
    } catch (error) {
      setFeedback({ type: 'error', text: error instanceof Error ? error.message : '移动文件失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="h-screen p-4 text-foreground sm:p-6 lg:p-8">
      <input ref={fileUploadInputRef} type="file" multiple className="hidden" onChange={(event) => void handleFileInputChange(event)} />
      <input ref={folderUploadInputRef} type="file" multiple className="hidden" onChange={(event) => void handleFileInputChange(event)} />

      <section className="flex h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card/85 shadow-[var(--shadow-soft)] backdrop-blur sm:h-[calc(100vh-3rem)] lg:h-[calc(100vh-4rem)]">
        <div className="grid min-h-0 flex-1 lg:grid-cols-[400px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b border-border/70 bg-card/75 lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-border/70 px-4 py-4 sm:px-5">
              <div className="rounded-lg border border-border/80 bg-background/80 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">当前选中</p>
                    <p className="mt-1 truncate text-sm font-medium">{selectedNode.relativePath}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedNode.type === 'folder' ? '文件夹' : '文件'}</p>
                  </div>
                  <div className="flex shrink-0 items-start gap-2">
                    <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">操作目录 {activeFolderPath}</span>
                    <button type="button" aria-label="刷新文件树" title="刷新文件树" onClick={() => void refreshTree(selectedPath)} className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-foreground">
                      <RefreshCw className={['size-4', loading ? 'animate-spin' : ''].join(' ')} />
                    </button>
                    <button type="button" aria-label={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'} title={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-foreground">
                      {resolvedTheme === 'dark' ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">文件夹 {treeStats.folders}</span>
                  <span className="rounded-full border border-border bg-card px-2.5 py-1">文件 {treeStats.files}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="tree-search" className="text-xs font-medium text-muted-foreground">搜索文件或文件夹</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="tree-search" value={searchKeyword} onChange={(event) => setSearchKeyword(event.target.value)} placeholder="按名称或路径搜索" className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/20" />
                </div>
                {deferredSearchKeyword ? <p className="text-xs text-muted-foreground">当前显示 {visibleNodeCount} 个匹配节点，搜索期间会自动展开目录。</p> : null}
              </div>

              {feedback ? <div className={['rounded-lg border px-4 py-3 text-sm', feedback.type === 'success' ? 'border-primary/25 bg-primary/10 text-foreground' : feedback.type === 'info' ? 'border-border bg-background text-foreground' : 'border-destructive/25 bg-destructive/10 text-foreground'].join(' ')}>{feedback.text}</div> : null}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-2 py-3 sm:px-3">
              <TreeNodeList
                nodes={[{ ...rootNode, children: visibleTree }]}
                selectedPath={selectedPath}
                expandedPaths={visibleExpandedPaths}
                composingPath={composingPath}
                folderName={folderName}
                submitting={submitting}
                dragState={dragState}
                onSelect={handleSelect}
                onToggleExpand={handleToggleExpand}
                onStartCreateFolder={handleStartCreateFolder}
                onFolderNameChange={setFolderName}
                onCreateFolder={() => void handleCreateFolder()}
                onCancelCreateFolder={() => { setComposingPath(null); setFolderName('') }}
                onUploadFiles={(pathName) => handleStartUpload(pathName, 'files')}
                onUploadFolder={(pathName) => handleStartUpload(pathName, 'folder')}
                onDelete={(pathName) => void handleDeleteTarget(pathName)}
                onDragStart={handleDragStart}
                onDragEnd={resetDragState}
                onDragOver={handleDragOver}
                onDrop={(node, event) => void handleDrop(node, event)}
                isValidDropTarget={isValidDropTarget}
              />

              {loading ? <div className="px-3 py-6 text-sm text-muted-foreground">正在读取文件树...</div> : null}
              {!loading && deferredSearchKeyword && visibleTree.length === 0 ? <div className="px-3 py-6 text-sm text-muted-foreground">没有匹配的文件或文件夹。</div> : null}
              {!loading && !deferredSearchKeyword && tree.length === 0 ? <div className="px-3 py-6 text-sm text-muted-foreground">当前 `file` 目录为空，可在根节点上直接新建文件夹或上传文件。</div> : null}
            </div>
          </aside>

          <PreviewPanel selectedNode={selectedNode} previewState={previewState} />
        </div>
      </section>
    </main>
  )
}
