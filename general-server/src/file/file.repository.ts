import {
  access,
  appendFile,
  cp,
  copyFile,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HttpStatus } from '../../utils/constant/HttpStatus.ts'
import { FileEntity } from './file.entity.ts'

const DEFAULT_FILE_ROOT_PATH = fileURLToPath(new URL('../../../file', import.meta.url))
const DEFAULT_RUBBISH_ROOT_PATH = fileURLToPath(new URL('../../../rubbish', import.meta.url))
const DEFAULT_UPLOAD_CHUNK_ROOT_PATH = path.join(os.tmpdir(), 'super-pro-file-upload-chunks')

type FileRepositoryErrorCode =
  | 'PATH_OUT_OF_ROOT'
  | 'TARGET_NOT_FOUND'
  | 'TARGET_ALREADY_EXISTS'
  | 'PARENT_NOT_FOUND'
  | 'PARENT_NOT_DIRECTORY'
  | 'TARGET_IS_ROOT'
  | 'INVALID_TARGET'

export interface FileRepositoryErrorContext {
  field: string
  reason: string
  value?: unknown
}

export class FileRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: FileRepositoryErrorCode,
    public readonly context: FileRepositoryErrorContext,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = 'FileRepositoryError'
  }
}

export interface CreateFolderInput {
  parentPath: string
  folderName: string
}

export interface UploadFileItemInput {
  originalname: string
  relativePath: string
  buffer?: Buffer
  sourcePath?: string
}

export interface UploadFileInput {
  targetPath: string
  files: UploadFileItemInput[]
}

export interface UploadFileChunkInput {
  targetPath: string
  relativePath: string
  uploadId: string
  chunkIndex: number
  totalChunks: number
  chunkBuffer: Buffer
}

export interface CompleteChunkUploadInput {
  targetPath: string
  relativePath: string
  uploadId: string
  totalChunks: number
}

export interface CompleteChunkUploadBatchItemInput {
  relativePath: string
  uploadId: string
  totalChunks: number
}

export interface CompleteChunkUploadBatchInput {
  targetPath: string
  items: CompleteChunkUploadBatchItemInput[]
}

export interface UploadChunkProgress {
  uploadId: string
  chunkIndex: number
  receivedChunks: number
  totalChunks: number
}

export interface DeleteFileInput {
  targetPath: string
}

export interface MoveTargetInput {
  sourcePath: string
  destinationPath: string
}

export interface PreviewFileInput {
  targetPath: string
}

export interface PreviewFileResult {
  file: FileEntity
  absolutePath: string
}

export interface FileRepositoryPort {
  ensureRoots(): Promise<void>
  getFileTree(): Promise<FileEntity[]>
  createFolder(input: CreateFolderInput): Promise<FileEntity>
  saveUploadedFiles(input: UploadFileInput): Promise<FileEntity[]>
  appendUploadChunk(input: UploadFileChunkInput): Promise<UploadChunkProgress>
  commitUploadChunks(input: CompleteChunkUploadInput): Promise<FileEntity>
  commitUploadChunkBatch(input: CompleteChunkUploadBatchInput): Promise<FileEntity[]>
  deleteTarget(input: DeleteFileInput): Promise<FileEntity>
  moveTarget(input: MoveTargetInput): Promise<FileEntity>
  getPreviewFile(input: PreviewFileInput): Promise<PreviewFileResult>
}

type PreparedUploadFile = {
  file: UploadFileItemInput
  destinationPath: string
  destinationRelativePath: string
  destinationDirectory: string
}

type UploadChunkSessionMeta = {
  targetPath: string
  relativePath: string
  totalChunks: number
  receivedChunks: number
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function normalizeRelativeInputPath(value: string): string {
  const raw = value.trim().replace(/\\/g, '/')
  const segments = raw.split('/').filter(Boolean)
  if (segments.includes('..')) {
    throw new FileRepositoryError(
      '目标路径超出 file 根目录范围',
      'PATH_OUT_OF_ROOT',
      {
        field: 'targetPath',
        reason: '目标路径不能包含越界路径段',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const normalized = path.posix.normalize(raw)
  const ensured = normalized.startsWith('/') ? normalized : `/${normalized}`
  return ensured === '/.' ? '/' : ensured
}

function normalizeUploadRelativePath(value: string): string {
  const raw = value.trim().replace(/\\/g, '/')
  if (!raw || raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) {
    throw new FileRepositoryError(
      '上传相对路径不合法',
      'INVALID_TARGET',
      {
        field: 'relativePaths',
        reason: '上传相对路径必须是目标目录下的相对路径',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  const normalized = path.posix.normalize(raw)
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0 || segments.includes('..')) {
    throw new FileRepositoryError(
      '上传相对路径不合法',
      'INVALID_TARGET',
      {
        field: 'relativePaths',
        reason: '上传相对路径不能包含越界路径段',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }

  return segments.join('/')
}

function ensurePathWithinBase(basePath: string, absolutePath: string, field: string, value: string) {
  const relative = path.relative(basePath, absolutePath)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new FileRepositoryError(
      '目标路径超出 file 根目录范围',
      'PATH_OUT_OF_ROOT',
      {
        field,
        reason: '目标路径必须位于受控目录内',
        value,
      },
      HttpStatus.BAD_REQUEST,
    )
  }
}

function resolveWorkspaceRootPath(
  envKey: 'FILE_ROOT_PATH' | 'RUBBISH_ROOT_PATH' | 'FILE_UPLOAD_CHUNK_ROOT_PATH',
): string {
  const configured = process.env[envKey]?.trim()
  if (configured) {
    return path.resolve(configured)
  }

  if (envKey === 'FILE_ROOT_PATH') {
    return DEFAULT_FILE_ROOT_PATH
  }

  if (envKey === 'RUBBISH_ROOT_PATH') {
    return DEFAULT_RUBBISH_ROOT_PATH
  }

  return DEFAULT_UPLOAD_CHUNK_ROOT_PATH
}

export function getFileRootPath(): string {
  return resolveWorkspaceRootPath('FILE_ROOT_PATH')
}

export function getRubbishRootPath(): string {
  return resolveWorkspaceRootPath('RUBBISH_ROOT_PATH')
}

export function getFileUploadChunkRootPath(): string {
  return resolveWorkspaceRootPath('FILE_UPLOAD_CHUNK_ROOT_PATH')
}

function resolveFileRootTarget(targetPath: string, field: string) {
  const rootPath = getFileRootPath()
  const normalized = normalizeRelativeInputPath(targetPath)
  const relative = normalized === '/' ? '' : normalized.slice(1)
  const absolutePath = path.resolve(rootPath, relative)
  ensurePathWithinBase(rootPath, absolutePath, field, targetPath)

  return {
    rootPath,
    normalizedPath: normalized,
    absolutePath,
  }
}

function toRelativePath(rootPath: string, absolutePath: string): string {
  const relative = path.relative(rootPath, absolutePath)
  if (!relative) {
    return '/'
  }

  return `/${toPosixPath(relative)}`
}

function createFileEntityFromStat(
  rootPath: string,
  absolutePath: string,
  stats: Awaited<ReturnType<typeof stat>>,
): FileEntity {
  return Object.assign(new FileEntity(), {
    name: path.basename(absolutePath),
    relativePath: toRelativePath(rootPath, absolutePath),
    type: stats.isDirectory() ? 'folder' : 'file',
    ...(stats.isFile() ? { size: stats.size } : {}),
    modifiedTime: stats.mtime,
    children: [],
  } satisfies FileEntity)
}

async function buildNode(rootPath: string, absolutePath: string): Promise<FileEntity> {
  const stats = await stat(absolutePath)
  const entity = createFileEntityFromStat(rootPath, absolutePath, stats)

  if (stats.isDirectory()) {
    const dirents = await readdir(absolutePath, {
      withFileTypes: true,
    })

    entity.children = (
      await Promise.all(
        dirents.map(async (dirent) => buildNode(rootPath, path.join(absolutePath, dirent.name))),
      )
    ).sort(compareFileEntity)
  }

  return entity
}

function compareFileEntity(left: FileEntity, right: FileEntity): number {
  if (left.type !== right.type) {
    return left.type === 'folder' ? -1 : 1
  }

  return left.name.localeCompare(right.name, 'zh-CN')
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

function getUploadChunkSessionPaths(uploadId: string) {
  const chunkRootPath = getFileUploadChunkRootPath()
  const sessionDirectoryPath = path.resolve(chunkRootPath, uploadId)
  ensurePathWithinBase(chunkRootPath, sessionDirectoryPath, 'uploadId', uploadId)

  return {
    chunkRootPath,
    sessionDirectoryPath,
    metaFilePath: path.join(sessionDirectoryPath, 'meta.json'),
    payloadFilePath: path.join(sessionDirectoryPath, 'payload.bin'),
  }
}

async function readUploadChunkSessionMeta(metaFilePath: string): Promise<UploadChunkSessionMeta | null> {
  try {
    const raw = await readFile(metaFilePath, 'utf8')
    return JSON.parse(raw) as UploadChunkSessionMeta
  } catch {
    return null
  }
}

async function writeUploadChunkSessionMeta(
  metaFilePath: string,
  meta: UploadChunkSessionMeta,
): Promise<void> {
  await writeFile(metaFilePath, JSON.stringify(meta), 'utf8')
}

function buildRubbishBucket(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const millisecond = String(now.getMilliseconds()).padStart(3, '0')

  return `${year}-${month}-${day}_${hour}-${minute}-${second}-${millisecond}`
}

function hasBatchPathConflict(current: string, seenPaths: Set<string>): boolean {
  for (const seenPath of seenPaths) {
    if (
      current === seenPath
      || current.startsWith(`${seenPath}/`)
      || seenPath.startsWith(`${current}/`)
    ) {
      return true
    }
  }

  return false
}

async function ensureParentChainIsWritable(
  targetDirectory: string,
  destinationDirectory: string,
  destinationRelativePath: string,
) {
  let currentDirectory = destinationDirectory

  while (currentDirectory !== targetDirectory) {
    const currentStats = await stat(currentDirectory).catch(() => null)
    if (currentStats?.isFile()) {
      throw new FileRepositoryError(
        '目标目录下已存在同名文件或文件夹',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'file',
          reason: '上传目标路径与现有文件结构冲突',
          value: destinationRelativePath,
        },
        HttpStatus.CONFLICT,
      )
    }

    const parentDirectory = path.dirname(currentDirectory)
    if (parentDirectory === currentDirectory) {
      break
    }

    currentDirectory = parentDirectory
  }
}

type MoveFileSystemOps = {
  rename: typeof rename
  stat: typeof stat
  cp: typeof cp
  rm: typeof rm
  copyFile: typeof copyFile
  unlink: typeof unlink
}

export async function moveFileSystemEntry(
  sourcePath: string,
  destinationPath: string,
  ops: MoveFileSystemOps = {
    rename,
    stat,
    cp,
    rm,
    copyFile,
    unlink,
  },
): Promise<void> {
  try {
    await ops.rename(sourcePath, destinationPath)
  } catch (error) {
    const errorCode = error instanceof Error && 'code' in error ? String(error.code) : ''
    if (errorCode !== 'EXDEV') {
      throw error
    }

    const sourceStats = await ops.stat(sourcePath)

    if (sourceStats.isDirectory()) {
      await ops.cp(sourcePath, destinationPath, { recursive: true })
      await ops.rm(sourcePath, { recursive: true, force: true })
      return
    }

    await ops.copyFile(sourcePath, destinationPath)
    await ops.unlink(sourcePath).catch(() => null)
  }
}

async function ensureExistingTarget(
  targetPath: string,
  field: string,
): Promise<{
  rootPath: string
  normalizedPath: string
  absolutePath: string
  stats: Awaited<ReturnType<typeof stat>>
}> {
  const resolved = resolveFileRootTarget(targetPath, field)
  const stats = await stat(resolved.absolutePath).catch(() => null)

  if (!stats) {
    throw new FileRepositoryError(
      '目标路径不存在',
      'TARGET_NOT_FOUND',
      {
        field,
        reason: '目标路径必须存在',
        value: targetPath,
      },
      HttpStatus.NOT_FOUND,
    )
  }

  return {
    ...resolved,
    stats,
  }
}

export class FileRepository implements FileRepositoryPort {
  async ensureRoots(): Promise<void> {
    await Promise.all([
      mkdir(getFileRootPath(), { recursive: true }),
      mkdir(getRubbishRootPath(), { recursive: true }),
      mkdir(getFileUploadChunkRootPath(), { recursive: true }),
    ])
  }

  async getFileTree(): Promise<FileEntity[]> {
    await this.ensureRoots()
    const rootPath = getFileRootPath()
    const dirents = await readdir(rootPath, { withFileTypes: true })

    const nodes = await Promise.all(
      dirents.map((dirent) => buildNode(rootPath, path.join(rootPath, dirent.name))),
    )

    return nodes.sort(compareFileEntity)
  }

  async createFolder(input: CreateFolderInput): Promise<FileEntity> {
    await this.ensureRoots()
    const { rootPath, absolutePath: parentPath } = resolveFileRootTarget(input.parentPath, 'parentPath')
    const parentStats = await stat(parentPath).catch(() => null)

    if (!parentStats) {
      throw new FileRepositoryError(
        '目标父目录不存在',
        'PARENT_NOT_FOUND',
        {
          field: 'parentPath',
          reason: '创建文件夹时目标父目录必须存在',
          value: input.parentPath,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    if (!parentStats.isDirectory()) {
      throw new FileRepositoryError(
        '目标父路径不是文件夹',
        'PARENT_NOT_DIRECTORY',
        {
          field: 'parentPath',
          reason: '创建文件夹时目标父路径必须是文件夹',
          value: input.parentPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const targetPath = path.resolve(parentPath, input.folderName)
    ensurePathWithinBase(rootPath, targetPath, 'folderName', input.folderName)

    if (await pathExists(targetPath)) {
      throw new FileRepositoryError(
        '同级目录下已存在同名文件或文件夹',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'folderName',
          reason: '创建文件夹时不允许覆盖同名目标',
          value: input.folderName,
        },
        HttpStatus.CONFLICT,
      )
    }

    await mkdir(targetPath)
    return buildNode(rootPath, targetPath)
  }

  async saveUploadedFiles(input: UploadFileInput): Promise<FileEntity[]> {
    await this.ensureRoots()

    if (input.files.length === 0) {
      throw new FileRepositoryError(
        '请上传有效文件',
        'INVALID_TARGET',
        {
          field: 'file',
          reason: '上传文件不能为空',
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const { rootPath, absolutePath: targetDirectory } = resolveFileRootTarget(
      input.targetPath,
      'targetPath',
    )
    const parentStats = await stat(targetDirectory).catch(() => null)

    if (!parentStats) {
      throw new FileRepositoryError(
        '上传目标目录不存在',
        'PARENT_NOT_FOUND',
        {
          field: 'targetPath',
          reason: '上传文件时目标目录必须存在',
          value: input.targetPath,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    if (!parentStats.isDirectory()) {
      throw new FileRepositoryError(
        '上传目标路径不是文件夹',
        'PARENT_NOT_DIRECTORY',
        {
          field: 'targetPath',
          reason: '上传文件时目标路径必须是文件夹',
          value: input.targetPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const preparedUploads: PreparedUploadFile[] = []
    const destinationPathSet = new Set<string>()

    for (const file of input.files) {
      if (!Buffer.isBuffer(file.buffer) && !(typeof file.sourcePath === 'string' && file.sourcePath.trim())) {
        throw new FileRepositoryError(
          '璇蜂笂浼犳湁鏁堟枃浠?',
          'INVALID_TARGET',
          {
            field: 'file',
            reason: '涓婁紶鏂囦欢鍐呭涓嶈兘涓虹┖',
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      const normalizedRelativePath = normalizeUploadRelativePath(file.relativePath)
      const destinationPath = path.resolve(targetDirectory, normalizedRelativePath)

      ensurePathWithinBase(rootPath, destinationPath, 'file', normalizedRelativePath)
      ensurePathWithinBase(targetDirectory, destinationPath, 'file', normalizedRelativePath)

      const destinationRelativePath = toPosixPath(path.relative(targetDirectory, destinationPath))
      if (hasBatchPathConflict(destinationRelativePath, destinationPathSet)) {
        throw new FileRepositoryError(
          '上传批次中存在冲突的目标路径',
          'TARGET_ALREADY_EXISTS',
          {
            field: 'relativePaths',
            reason: '上传批次内不能出现重复路径或文件与目录冲突',
            value: normalizedRelativePath,
          },
          HttpStatus.CONFLICT,
        )
      }

      if (await pathExists(destinationPath)) {
        throw new FileRepositoryError(
          '目标目录下已存在同名文件或文件夹',
          'TARGET_ALREADY_EXISTS',
          {
            field: 'file',
            reason: '上传文件时不允许覆盖同名目标',
            value: normalizedRelativePath,
          },
          HttpStatus.CONFLICT,
        )
      }

      const destinationDirectory = path.dirname(destinationPath)
      await ensureParentChainIsWritable(targetDirectory, destinationDirectory, normalizedRelativePath)

      preparedUploads.push({
        file,
        destinationPath,
        destinationRelativePath,
        destinationDirectory,
      })
      destinationPathSet.add(destinationRelativePath)
    }

    const createdNodes: FileEntity[] = []

    for (const preparedUpload of preparedUploads) {
      await mkdir(preparedUpload.destinationDirectory, { recursive: true })

      if (Buffer.isBuffer(preparedUpload.file.buffer)) {
        await writeFile(preparedUpload.destinationPath, preparedUpload.file.buffer)
      } else if (preparedUpload.file.sourcePath) {
        await moveFileSystemEntry(preparedUpload.file.sourcePath, preparedUpload.destinationPath)
      }

      createdNodes.push(await buildNode(rootPath, preparedUpload.destinationPath))
    }

    return createdNodes
  }

  async appendUploadChunk(input: UploadFileChunkInput): Promise<UploadChunkProgress> {
    await this.ensureRoots()

    const sessionPaths = getUploadChunkSessionPaths(input.uploadId)

    if (input.chunkIndex === 0) {
      await rm(sessionPaths.sessionDirectoryPath, { recursive: true, force: true })
      await mkdir(sessionPaths.sessionDirectoryPath, { recursive: true })
    }

    let meta = await readUploadChunkSessionMeta(sessionPaths.metaFilePath)
    if (!meta) {
      if (input.chunkIndex !== 0) {
        throw new FileRepositoryError(
          '涓婁紶鍒嗙墖浼氳瘽涓嶅瓨鍦ㄦ垨宸茶繃鏈?',
          'INVALID_TARGET',
          {
            field: 'uploadId',
            reason: '鍒嗙墖涓婁紶闇€瑕佷粠绗竴鐗囧紑濮嬫寜椤哄簭鎻愪氦',
            value: input.uploadId,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      meta = {
        targetPath: input.targetPath,
        relativePath: input.relativePath,
        totalChunks: input.totalChunks,
        receivedChunks: 0,
      }
    }

    if (
      meta.targetPath !== input.targetPath
      || meta.relativePath !== input.relativePath
      || meta.totalChunks !== input.totalChunks
    ) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖鍙傛暟涓嶄竴鑷?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '鍚屼竴 uploadId 鐨勭洰鏍囪矾寰勩€佺浉瀵硅矾寰勫拰鍒嗙墖鎬绘暟蹇呴』淇濇寔涓€鑷?',
          value: input.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (meta.receivedChunks !== input.chunkIndex) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖椤哄簭涓嶆纭?',
        'INVALID_TARGET',
        {
          field: 'chunkIndex',
          reason: '鍒嗙墖蹇呴』鎸夌収椤哄簭渚濇涓婁紶',
          value: input.chunkIndex,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    await mkdir(sessionPaths.sessionDirectoryPath, { recursive: true })
    await appendFile(sessionPaths.payloadFilePath, input.chunkBuffer)

    meta.receivedChunks += 1
    await writeUploadChunkSessionMeta(sessionPaths.metaFilePath, meta)

    return {
      uploadId: input.uploadId,
      chunkIndex: input.chunkIndex,
      receivedChunks: meta.receivedChunks,
      totalChunks: meta.totalChunks,
    }
  }

  private async collectCompletedChunkUploadFile(
    targetPath: string,
    item: CompleteChunkUploadBatchItemInput,
  ): Promise<UploadFileItemInput> {
    const sessionPaths = getUploadChunkSessionPaths(item.uploadId)
    const meta = await readUploadChunkSessionMeta(sessionPaths.metaFilePath)

    if (!meta) {
      throw new FileRepositoryError(
        '娑撳﹣绱堕崚鍡欏娴兼俺鐦芥稉宥呯摠閸︺劍鍨ㄥ鑼剁箖閺?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '閹靛彞绗夐崚鏉垮嚒娑撳﹣绱堕惃鍕瀻閻楀洣绱扮拠?',
          value: item.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (
      meta.targetPath !== targetPath
      || meta.relativePath !== item.relativePath
      || meta.totalChunks !== item.totalChunks
    ) {
      throw new FileRepositoryError(
        '娑撳﹣绱堕崚鍡欏閸欏倹鏆熸稉宥勭閼?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '閸掑棛澧栭崥鍫濊嫙閸欏倹鏆熸稉搴″嚒娑撳﹣绱堕崚鍡欏娑撳秳绔撮懛?',
          value: item.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (meta.receivedChunks !== meta.totalChunks) {
      throw new FileRepositoryError(
        '娑撳﹣绱堕崚鍡欏鐏忔碍婀€瑰本鍨?',
        'INVALID_TARGET',
        {
          field: 'totalChunks',
          reason: '閹碘偓閺堝鍨庨悧鍥厴娑撳﹣绱剁€瑰本鍨氶崥搴㈠閼宠棄鎮庨獮?',
          value: meta.receivedChunks,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (!(await pathExists(sessionPaths.payloadFilePath))) {
      throw new FileRepositoryError(
        '娑撳﹣绱堕崚鍡欏閸愬懎顔愭稉宥呯摠閸?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '閹靛彞绗夐崚鏉跨窡閸氬牆鑻熼惃鍕瀻閻楀洦鏋冩禒?',
          value: item.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    return {
      originalname: path.posix.basename(meta.relativePath),
      relativePath: meta.relativePath,
      sourcePath: sessionPaths.payloadFilePath,
    }
  }

  async commitUploadChunks(input: CompleteChunkUploadInput): Promise<FileEntity> {
    await this.ensureRoots()

    const sessionPaths = getUploadChunkSessionPaths(input.uploadId)
    const meta = await readUploadChunkSessionMeta(sessionPaths.metaFilePath)

    if (!meta) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖浼氳瘽涓嶅瓨鍦ㄦ垨宸茶繃鏈?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '鎵句笉鍒板凡涓婁紶鐨勫垎鐗囦細璇?',
          value: input.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (
      meta.targetPath !== input.targetPath
      || meta.relativePath !== input.relativePath
      || meta.totalChunks !== input.totalChunks
    ) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖鍙傛暟涓嶄竴鑷?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '鍒嗙墖鍚堝苟鍙傛暟涓庡凡涓婁紶鍒嗙墖涓嶄竴鑷?',
          value: input.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (meta.receivedChunks !== meta.totalChunks) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖灏氭湭瀹屾垚',
        'INVALID_TARGET',
        {
          field: 'totalChunks',
          reason: '鎵€鏈夊垎鐗囬兘涓婁紶瀹屾垚鍚庢墠鑳藉悎骞?',
          value: meta.receivedChunks,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (!(await pathExists(sessionPaths.payloadFilePath))) {
      throw new FileRepositoryError(
        '涓婁紶鍒嗙墖鍐呭涓嶅瓨鍦?',
        'INVALID_TARGET',
        {
          field: 'uploadId',
          reason: '鎵句笉鍒板緟鍚堝苟鐨勫垎鐗囨枃浠?',
          value: input.uploadId,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const [saved] = await this.saveUploadedFiles({
      targetPath: input.targetPath,
      files: [
        {
          originalname: path.posix.basename(meta.relativePath),
          relativePath: meta.relativePath,
          sourcePath: sessionPaths.payloadFilePath,
        },
      ],
    })

    await rm(sessionPaths.sessionDirectoryPath, { recursive: true, force: true })

    return saved
  }

  async commitUploadChunkBatch(input: CompleteChunkUploadBatchInput): Promise<FileEntity[]> {
    await this.ensureRoots()

    const uploadFiles: UploadFileItemInput[] = []

    for (const item of input.items) {
      const sessionPaths = getUploadChunkSessionPaths(item.uploadId)
      const meta = await readUploadChunkSessionMeta(sessionPaths.metaFilePath)

      if (!meta) {
        throw new FileRepositoryError(
          '娑撳﹣绱堕崚鍡欏娴兼俺鐦芥稉宥呯摠閸︺劍鍨ㄥ鑼剁箖閺?',
          'INVALID_TARGET',
          {
            field: 'uploadId',
            reason: '閹靛彞绗夐崚鏉垮嚒娑撳﹣绱堕惃鍕瀻閻楀洣绱扮拠?',
            value: item.uploadId,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      if (
        meta.targetPath !== input.targetPath
        || meta.relativePath !== item.relativePath
        || meta.totalChunks !== item.totalChunks
      ) {
        throw new FileRepositoryError(
          '娑撳﹣绱堕崚鍡欏閸欏倹鏆熸稉宥勭閼?',
          'INVALID_TARGET',
          {
            field: 'uploadId',
            reason: '閸掑棛澧栭崥鍫濊嫙閸欏倹鏆熸稉搴″嚒娑撳﹣绱堕崚鍡欏娑撳秳绔撮懛?',
            value: item.uploadId,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      if (meta.receivedChunks !== meta.totalChunks) {
        throw new FileRepositoryError(
          '娑撳﹣绱堕崚鍡欏鐏忔碍婀€瑰本鍨?',
          'INVALID_TARGET',
          {
            field: 'totalChunks',
            reason: '閹碘偓閺堝鍨庨悧鍥厴娑撳﹣绱剁€瑰本鍨氶崥搴㈠閼宠棄鎮庨獮?',
            value: meta.receivedChunks,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      if (!(await pathExists(sessionPaths.payloadFilePath))) {
        throw new FileRepositoryError(
          '娑撳﹣绱堕崚鍡欏閸愬懎顔愭稉宥呯摠閸?',
          'INVALID_TARGET',
          {
            field: 'uploadId',
            reason: '閹靛彞绗夐崚鏉跨窡閸氬牆鑻熼惃鍕瀻閻楀洦鏋冩禒?',
            value: item.uploadId,
          },
          HttpStatus.BAD_REQUEST,
        )
      }

      uploadFiles.push({
        originalname: path.posix.basename(meta.relativePath),
        relativePath: meta.relativePath,
        sourcePath: sessionPaths.payloadFilePath,
      })
    }

    const saved = await this.saveUploadedFiles({
      targetPath: input.targetPath,
      files: uploadFiles,
    })

    await Promise.all(
      input.items.map((item) =>
        rm(getUploadChunkSessionPaths(item.uploadId).sessionDirectoryPath, {
          recursive: true,
          force: true,
        }),
      ),
    )

    return saved
  }

  async deleteTarget(input: DeleteFileInput): Promise<FileEntity> {
    await this.ensureRoots()
    const { rootPath, normalizedPath, absolutePath } = resolveFileRootTarget(input.targetPath, 'targetPath')

    if (normalizedPath === '/') {
      throw new FileRepositoryError(
        '不允许删除 file 根目录',
        'TARGET_IS_ROOT',
        {
          field: 'targetPath',
          reason: '删除操作不能以 file 根目录作为目标',
          value: input.targetPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const targetStats = await stat(absolutePath).catch(() => null)
    if (!targetStats) {
      throw new FileRepositoryError(
        '待删除的文件或文件夹不存在',
        'TARGET_NOT_FOUND',
        {
          field: 'targetPath',
          reason: '删除目标必须存在',
          value: input.targetPath,
        },
        HttpStatus.NOT_FOUND,
      )
    }

    const targetEntity = await buildNode(rootPath, absolutePath)
    const relativePath = normalizedPath.slice(1)
    const rubbishTargetPath = path.join(getRubbishRootPath(), buildRubbishBucket(), relativePath)

    if (await pathExists(rubbishTargetPath)) {
      throw new FileRepositoryError(
        '回收站目标路径冲突，请稍后重试',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'targetPath',
          reason: '回收站目标路径发生冲突',
          value: input.targetPath,
        },
        HttpStatus.CONFLICT,
      )
    }

    await mkdir(path.dirname(rubbishTargetPath), { recursive: true })
    await moveFileSystemEntry(absolutePath, rubbishTargetPath)

    return targetEntity
  }

  async moveTarget(input: MoveTargetInput): Promise<FileEntity> {
    await this.ensureRoots()

    const source = await ensureExistingTarget(input.sourcePath, 'sourcePath')
    if (source.normalizedPath === '/') {
      throw new FileRepositoryError(
        '不允许移动 file 根目录',
        'TARGET_IS_ROOT',
        {
          field: 'sourcePath',
          reason: '移动操作不能以 file 根目录作为源目标',
          value: input.sourcePath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const destination = await ensureExistingTarget(input.destinationPath, 'destinationPath')
    if (!destination.stats.isDirectory()) {
      throw new FileRepositoryError(
        '目标路径不是文件夹',
        'PARENT_NOT_DIRECTORY',
        {
          field: 'destinationPath',
          reason: '移动目标必须是已存在的文件夹',
          value: input.destinationPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    if (
      source.stats.isDirectory()
      && (
        destination.absolutePath === source.absolutePath
        || destination.absolutePath.startsWith(`${source.absolutePath}${path.sep}`)
      )
    ) {
      throw new FileRepositoryError(
        '不允许将文件夹移动到自身或其子目录中',
        'INVALID_TARGET',
        {
          field: 'destinationPath',
          reason: '目标文件夹不能是当前文件夹自身或其子孙目录',
          value: input.destinationPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    const targetAbsolutePath = path.join(destination.absolutePath, path.basename(source.absolutePath))
    ensurePathWithinBase(destination.rootPath, targetAbsolutePath, 'destinationPath', input.destinationPath)

    if (targetAbsolutePath === source.absolutePath || await pathExists(targetAbsolutePath)) {
      throw new FileRepositoryError(
        '目标文件夹下已存在同名文件或文件夹',
        'TARGET_ALREADY_EXISTS',
        {
          field: 'destinationPath',
          reason: '移动目标目录下不允许出现同名冲突',
          value: input.destinationPath,
        },
        HttpStatus.CONFLICT,
      )
    }

    await rename(source.absolutePath, targetAbsolutePath)
    return buildNode(source.rootPath, targetAbsolutePath)
  }

  async getPreviewFile(input: PreviewFileInput): Promise<PreviewFileResult> {
    await this.ensureRoots()

    const target = await ensureExistingTarget(input.targetPath, 'targetPath')
    if (!target.stats.isFile()) {
      throw new FileRepositoryError(
        '预览目标必须是文件',
        'INVALID_TARGET',
        {
          field: 'targetPath',
          reason: '当前目标不是可预览的文件',
          value: input.targetPath,
        },
        HttpStatus.BAD_REQUEST,
      )
    }

    return {
      file: createFileEntityFromStat(target.rootPath, target.absolutePath, target.stats),
      absolutePath: target.absolutePath,
    }
  }
}

export const fileRepository = new FileRepository()
