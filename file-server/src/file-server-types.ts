import type { FileNode } from './file-tree'
import type { PreviewKind } from './file-preview'

export type ApiResponse<T> = {
  code: number
  msg: string
  data: T
  timestamp: number
}

export type UploadResponse = {
  targetPath: string
  uploadedCount: number
  uploaded: FileNode[]
}

export type ChunkUploadProgressResponse = {
  uploadId: string
  chunkIndex: number
  receivedChunks: number
  totalChunks: number
}

export type UploadMode = 'files' | 'folder'

export type FileWithRelativePath = File & {
  webkitRelativePath?: string
}

export type PendingUploadState = {
  targetPath: string
  mode: UploadMode
} | null

export type FeedbackState =
  | {
      type: 'success' | 'error' | 'info'
      text: string
    }
  | null

export type SpreadsheetSheet = {
  name: string
  rows: string[][]
}

export type PreviewState =
  | {
      status: 'idle'
    }
  | {
      status: 'folder'
      node: FileNode
    }
  | {
      status: 'loading'
      node: FileNode
      kind: PreviewKind
    }
  | {
      status: 'unsupported'
      node: FileNode
      message: string
    }
  | {
      status: 'error'
      node: FileNode
      message: string
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'markdown'
      html: string
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'text'
      text: string
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'docx'
      html: string
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'spreadsheet'
      sheets: SpreadsheetSheet[]
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'image' | 'pdf'
      objectUrl: string
    }
  | {
      status: 'ready'
      node: FileNode
      kind: 'audio' | 'video'
      sourceUrl: string
    }

export type DragState = {
  sourcePath: string | null
  sourceType: FileNode['type'] | null
  dropTargetPath: string | null
}
