import { createReadStream } from 'node:fs'
import type { Request, Response } from 'express'
import { HttpStatus } from '../../utils/constant/HttpStatus.ts'
import type {
  CompleteChunkUploadBatchRequestDto,
  CompleteChunkUploadRequestDto,
  CreateFolderRequestDto,
  DeleteFileRequestDto,
  DownloadFileRequestDto,
  MoveFileRequestDto,
  PreviewFileRequestDto,
  UploadedFileDto,
  UploadFileChunkRequestDto,
  UploadFileRequestDto,
} from './file.dto.ts'
import { FileBusinessError, fileService } from './file.service.ts'

type MulterFileMap = {
  [fieldname: string]: Express.Multer.File[]
}

type ByteRange = {
  start: number
  end: number
}

function toUploadedFileDto(file: Express.Multer.File): UploadedFileDto {
  return {
    originalname: file.originalname,
    mimetype: file.mimetype,
    buffer: file.buffer,
    size: file.size,
  }
}

function extractUploadedFiles(req: Request): UploadedFileDto[] | undefined {
  const files = req.files as MulterFileMap | Express.Multer.File[] | undefined

  if (!files) {
    return undefined
  }

  if (Array.isArray(files)) {
    return files.map(toUploadedFileDto)
  }

  const legacyFiles = files.file ?? []
  const batchFiles = files.files ?? []

  return [...legacyFiles, ...batchFiles].map(toUploadedFileDto)
}

function extractUploadedChunk(req: Request): UploadedFileDto | undefined {
  return req.file ? toUploadedFileDto(req.file) : undefined
}

function extractRelativePaths(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }

  if (typeof value === 'string') {
    return [value]
  }

  return undefined
}

function encodeContentDispositionFilename(filename: string): string {
  return encodeURIComponent(filename)
    .replace(/['()]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/\*/g, '%2A')
}

function parseRangeHeader(rangeHeader: string, fileSize: number): ByteRange | null {
  if (!rangeHeader.startsWith('bytes=')) {
    return null
  }

  const rangeValue = rangeHeader.slice(6).trim()
  if (!rangeValue || rangeValue.includes(',')) {
    return null
  }

  const segments = rangeValue.split('-')
  if (segments.length !== 2) {
    return null
  }

  const [rawStart, rawEnd] = segments
  if ((rawStart == null || rawStart === '') && (rawEnd == null || rawEnd === '')) {
    return null
  }

  if (rawStart == null || rawStart === '') {
    const suffixLength = Number.parseInt(rawEnd ?? '', 10)
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null
    }

    const start = Math.max(fileSize - suffixLength, 0)
    return {
      start,
      end: fileSize - 1,
    }
  }

  const start = Number.parseInt(rawStart, 10)
  const parsedEnd = rawEnd == null || rawEnd === '' ? fileSize - 1 : Number.parseInt(rawEnd, 10)
  if (!Number.isFinite(start) || !Number.isFinite(parsedEnd) || start < 0 || parsedEnd < start) {
    return null
  }

  if (start >= fileSize) {
    return null
  }

  return {
    start,
    end: Math.min(parsedEnd, fileSize - 1),
  }
}

const getFileTree = async (req: Request, res: Response) => {
  try {
    const tree = await fileService.getFileTree()
    res.sendSuccess(tree, '获取文件树成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('获取文件树失败', HttpStatus.ERROR)
  }
}

const createFolder = async (req: Request, res: Response) => {
  try {
    const created = await fileService.createFolder(req.body as CreateFolderRequestDto)
    res.sendSuccess(created, '创建文件夹成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('创建文件夹失败', HttpStatus.ERROR)
  }
}

const uploadFile = async (req: Request, res: Response) => {
  try {
    const uploadedFiles = extractUploadedFiles(req)
    const saved = await fileService.uploadFiles(
      {
        ...(req.body as UploadFileRequestDto),
        relativePaths: extractRelativePaths((req.body as UploadFileRequestDto).relativePaths),
      },
      uploadedFiles,
    )

    const message =
      saved.uploadedCount === 1
        ? '上传文件成功'
        : `上传 ${saved.uploadedCount} 个文件成功`

    res.sendSuccess(saved, message)
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('上传文件失败', HttpStatus.ERROR)
  }
}

const uploadFileChunk = async (req: Request, res: Response) => {
  try {
    const progress = await fileService.uploadFileChunk(
      req.body as UploadFileChunkRequestDto,
      extractUploadedChunk(req),
    )

    res.sendSuccess(progress, '上传分片成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('上传分片失败', HttpStatus.ERROR)
  }
}

const completeChunkUpload = async (req: Request, res: Response) => {
  try {
    const saved = await fileService.completeChunkUpload(req.body as CompleteChunkUploadRequestDto)
    res.sendSuccess(saved, '完成分片上传成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('完成分片上传失败', HttpStatus.ERROR)
  }
}

const completeChunkUploadBatch = async (req: Request, res: Response) => {
  try {
    const saved = await fileService.completeChunkUploadBatch(
      req.body as CompleteChunkUploadBatchRequestDto,
    )
    res.sendSuccess(saved, `完成 ${saved.uploadedCount} 个文件的分片上传`)
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('完成批量分片上传失败', HttpStatus.ERROR)
  }
}

const deleteFile = async (req: Request, res: Response) => {
  const payload = (
    req.body && Object.keys(req.body).length > 0
      ? req.body
      : req.query
  ) as DeleteFileRequestDto

  try {
    const deleted = await fileService.deleteTarget(payload)
    res.sendSuccess(deleted, '删除文件成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('删除文件失败', HttpStatus.ERROR)
  }
}

const moveFile = async (req: Request, res: Response) => {
  try {
    const moved = await fileService.moveTarget(req.body as MoveFileRequestDto)
    res.sendSuccess(moved, '移动文件成功')
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('移动文件失败', HttpStatus.ERROR)
  }
}

const previewFile = async (req: Request, res: Response) => {
  try {
    const preview = await fileService.getPreviewFile(req.query as unknown as PreviewFileRequestDto)
    const requestedRange =
      typeof req.headers.range === 'string' ? parseRangeHeader(req.headers.range, preview.size) : null

    if (typeof req.headers.range === 'string' && !requestedRange) {
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Range', `bytes */${preview.size}`)
      return res
        .status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
        .sendFail('请求的范围无效', HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
    }
    res.setHeader('Content-Type', preview.mimeType)
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeContentDispositionFilename(preview.name)}`,
    )
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('X-Preview-Size', String(preview.size))
    const stream = requestedRange
      ? createReadStream(preview.absolutePath, {
          start: requestedRange.start,
          end: requestedRange.end,
        })
      : createReadStream(preview.absolutePath)

    if (requestedRange) {
      const contentLength = requestedRange.end - requestedRange.start + 1
      res.setHeader('Content-Length', String(contentLength))
      res.setHeader(
        'Content-Range',
        `bytes ${requestedRange.start}-${requestedRange.end}/${preview.size}`,
      )
      res.status(HttpStatus.PARTIAL_CONTENT)
    } else {
      res.setHeader('Content-Length', String(preview.size))
      res.status(HttpStatus.SUCCESS)
    }

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(HttpStatus.ERROR).sendFail('读取预览文件失败', HttpStatus.ERROR)
        return
      }

      res.end()
    })

    stream.pipe(res)
    return
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('读取预览文件失败', HttpStatus.ERROR)
  }
}

const downloadFile = async (req: Request, res: Response) => {
  try {
    const download = await fileService.getDownloadFile(req.query as unknown as DownloadFileRequestDto)
    res.setHeader('Content-Type', download.mimeType)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeContentDispositionFilename(download.name)}`,
    )
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Content-Length', String(download.size))

    const stream = createReadStream(download.absolutePath)
    res.status(HttpStatus.SUCCESS)

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(HttpStatus.ERROR).sendFail('璇诲彇涓嬭浇鏂囦欢澶辫触', HttpStatus.ERROR)
        return
      }

      res.end()
    })

    stream.pipe(res)
    return
  } catch (error) {
    if (error instanceof FileBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode)
    }

    return res.status(HttpStatus.ERROR).sendFail('璇诲彇涓嬭浇鏂囦欢澶辫触', HttpStatus.ERROR)
  }
}

export {
  completeChunkUploadBatch,
  completeChunkUpload,
  createFolder,
  deleteFile,
  downloadFile,
  getFileTree,
  moveFile,
  previewFile,
  uploadFile,
  uploadFileChunk,
}
