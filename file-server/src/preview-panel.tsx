import type { PreviewKind } from './file-preview'
import { getPreviewKind } from './file-preview'
import type { PreviewState } from './file-server-types'
import type { FileNode } from './file-tree'

function formatFileSize(size?: number): string {
  if (typeof size !== 'number') {
    return '--'
  }

  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatTime(value?: string): string {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return date.toLocaleString('zh-CN', { hour12: false })
}

function getPreviewKindLabel(kind: PreviewKind): string {
  switch (kind) {
    case 'markdown':
      return 'Markdown'
    case 'text':
      return '文本'
    case 'image':
      return '图片'
    case 'audio':
      return '音频'
    case 'video':
      return '视频'
    case 'pdf':
      return 'PDF'
    case 'docx':
      return 'Word'
    case 'spreadsheet':
      return '表格'
    default:
      return '不支持'
  }
}

export function PreviewPanel({
  selectedNode,
  previewState,
}: {
  selectedNode: FileNode
  previewState: PreviewState
}) {
  const previewKind =
    previewState.status === 'ready' || previewState.status === 'loading'
      ? previewState.kind
      : selectedNode.type === 'file'
        ? getPreviewKind(selectedNode)
        : null

  return (
    <section className="flex min-h-0 flex-col bg-background/10">
      <div className="border-b border-border/70 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              预览工作区
            </p>
            <p className="mt-1 truncate text-base font-medium">
              {selectedNode.relativePath === '/' ? 'file 根目录' : selectedNode.relativePath}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedNode.type === 'folder' ? '文件夹上下文' : '文件预览'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {previewKind ? (
              <span className="rounded-full border border-border bg-card px-2.5 py-1">
                {getPreviewKindLabel(previewKind)}
              </span>
            ) : null}
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              大小 {formatFileSize(selectedNode.size)}
            </span>
            <span className="rounded-full border border-border bg-card px-2.5 py-1">
              修改时间 {formatTime(selectedNode.modifiedTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        {previewState.status === 'idle' ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-card/60 p-8 text-sm text-muted-foreground">
            选择文件后可在这里预览内容。
          </div>
        ) : null}

        {previewState.status === 'folder' ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-card/60 p-8 text-sm text-muted-foreground">
            当前选中的是文件夹。你可以继续在左侧完成新建、上传、删除或拖动移动。
          </div>
        ) : null}

        {previewState.status === 'loading' ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-border/70 bg-card/70 p-8 text-sm text-muted-foreground">
            正在准备 {getPreviewKindLabel(previewState.kind)} 预览...
          </div>
        ) : null}

        {previewState.status === 'unsupported' ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border bg-card/60 p-8 text-sm text-muted-foreground">
            {previewState.message}
          </div>
        ) : null}

        {previewState.status === 'error' ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-destructive/25 bg-destructive/10 p-8 text-sm text-foreground">
            {previewState.message}
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'markdown' ? (
          <div className="flex min-h-full justify-center">
            <article
              className="w-full max-w-4xl rounded-lg border border-border/70 bg-card/80 px-6 py-7 leading-7 shadow-2xs sm:px-8 sm:py-8 [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:mt-8 [&_h1]:scroll-m-20 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:first:mt-0 [&_h2]:mt-8 [&_h2]:scroll-m-20 [&_h2]:border-b [&_h2]:border-border/60 [&_h2]:pb-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:first:mt-0 [&_h3]:mt-6 [&_h3]:scroll-m-20 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_hr]:my-8 [&_hr]:border-border/60 [&_img]:mx-auto [&_img]:rounded-md [&_img]:border [&_img]:border-border/60 [&_img]:shadow-2xs [&_li]:my-1.5 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p]:text-[15px] [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/60 [&_pre]:bg-muted/70 [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[13px] [&_strong]:font-semibold [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-lg [&_table]:border [&_table]:border-border/60 [&_tbody_tr]:border-t [&_tbody_tr]:border-border/50 [&_td]:border-r [&_td]:border-border/40 [&_td]:px-3 [&_td]:py-2 [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-border/40 [&_th]:bg-muted/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th:last-child]:border-r-0 [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: previewState.html }}
            />
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'text' ? (
          <pre className="min-h-[260px] overflow-auto rounded-lg border border-border/70 bg-card/80 p-6 text-sm leading-6 whitespace-pre-wrap">
            {previewState.text}
          </pre>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'docx' ? (
          <article
            className="space-y-4 rounded-lg border border-border/70 bg-card/80 p-6 leading-7"
            dangerouslySetInnerHTML={{ __html: previewState.html }}
          />
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'spreadsheet' ? (
          <div className="space-y-4">
            {previewState.sheets.map((sheet) => (
              <section
                key={sheet.name}
                className="overflow-hidden rounded-lg border border-border/70 bg-card/80"
              >
                <header className="border-b border-border/70 px-4 py-3 text-sm font-medium">
                  {sheet.name}
                </header>
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <tbody>
                      {sheet.rows.length === 0 ? (
                        <tr>
                          <td className="px-4 py-6 text-muted-foreground">当前工作表没有可展示内容。</td>
                        </tr>
                      ) : (
                        sheet.rows.map((row, rowIndex) => (
                          <tr key={`${sheet.name}-${rowIndex}`} className="border-t border-border/50">
                            {row.map((cell, cellIndex) => (
                              <td
                                key={`${sheet.name}-${rowIndex}-${cellIndex}`}
                                className="max-w-[220px] border-r border-border/40 px-3 py-2 align-top last:border-r-0"
                              >
                                {cell || '-'}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'image' ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border/70 bg-card/70 p-4">
            <img
              src={previewState.objectUrl}
              alt={previewState.node.name}
              className="max-h-[70vh] max-w-full rounded-md object-contain"
            />
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'audio' ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border/70 bg-card/70 p-6">
            <audio controls preload="metadata" src={previewState.sourceUrl} className="w-full max-w-2xl" />
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'video' ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-border/70 bg-card/70 p-4">
            <video controls preload="metadata" src={previewState.sourceUrl} className="max-h-[70vh] max-w-full rounded-md" />
          </div>
        ) : null}

        {previewState.status === 'ready' && previewState.kind === 'pdf' ? (
          <div className="h-full min-h-[70vh] overflow-hidden rounded-lg border border-border/70 bg-card/70">
            <iframe title={previewState.node.name} src={previewState.objectUrl} className="h-full min-h-[70vh] w-full" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
