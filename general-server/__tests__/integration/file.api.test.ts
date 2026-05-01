import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Express } from 'express'
import request from 'supertest'
import { createApp } from '../../app.ts'

type TestContext = {
  sandboxRoot: string
  fileRoot: string
  rubbishRoot: string
  chunkRoot: string
}

const macosChineseFilename = '\u6d4b\u8bd5.txt'

function createMojibakeFilename(value: string): string {
  return Buffer.from(value, 'utf8').toString('latin1')
}

async function createTestContext(prefix: string): Promise<TestContext> {
  const sandboxRoot = await mkdtemp(path.join(os.tmpdir(), prefix))
  const fileRoot = path.join(sandboxRoot, 'file')
  const rubbishRoot = path.join(sandboxRoot, 'rubbish')
  const chunkRoot = path.join(sandboxRoot, 'chunk')

  await mkdir(fileRoot, { recursive: true })
  await mkdir(rubbishRoot, { recursive: true })
  await mkdir(chunkRoot, { recursive: true })

  process.env.FILE_ROOT_PATH = fileRoot
  process.env.RUBBISH_ROOT_PATH = rubbishRoot
  process.env.FILE_UPLOAD_CHUNK_ROOT_PATH = chunkRoot
  process.env.JWT_ENABLED = 'false'

  return {
    sandboxRoot,
    fileRoot,
    rubbishRoot,
    chunkRoot,
  }
}

describe('file 文件服务接口', () => {
  let context: TestContext
  let app: Express

  beforeEach(async () => {
    context = await createTestContext('file-service-api-')
    app = createApp()
  })

  afterEach(async () => {
    delete process.env.FILE_ROOT_PATH
    delete process.env.RUBBISH_ROOT_PATH
    delete process.env.FILE_UPLOAD_CHUNK_ROOT_PATH
    process.env.JWT_ENABLED = 'false'
    await rm(context.sandboxRoot, { recursive: true, force: true })
  })

  it('GET /api/file/tree 应返回 file 目录树', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')
    await writeFile(path.join(context.fileRoot, 'readme.txt'), 'hello')

    const res = await request(app).get('/api/file/tree')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '获取文件树成功',
      data: [
        expect.objectContaining({
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            expect.objectContaining({
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
            }),
          ],
        }),
        expect.objectContaining({
          name: 'readme.txt',
          relativePath: '/readme.txt',
          type: 'file',
        }),
      ],
    })
  })

  it('POST /api/file/folder 应创建文件夹', async () => {
    const res = await request(app).post('/api/file/folder').send({
      parentPath: '/',
      folderName: 'assets',
    })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '创建文件夹成功',
      data: expect.objectContaining({
        name: 'assets',
        relativePath: '/assets',
        type: 'folder',
      }),
    })

    const createdStats = await stat(path.join(context.fileRoot, 'assets'))
    expect(createdStats.isDirectory()).toBe(true)
  })

  it('POST /api/file/upload 应兼容旧单文件字段', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .attach('file', Buffer.from('hello file', 'utf8'), {
        filename: 'hello.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传文件成功',
      data: expect.objectContaining({
        targetPath: '/docs',
        uploadedCount: 1,
        uploaded: [
          expect.objectContaining({
            name: 'hello.txt',
            relativePath: '/docs/hello.txt',
            type: 'file',
          }),
        ],
      }),
    })

    const fileContent = await readFile(path.join(context.fileRoot, 'docs', 'hello.txt'), 'utf8')
    expect(fileContent).toBe('hello file')
  })

  it('POST /api/file/upload 应支持批量文件上传', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .field('relativePaths', 'alpha.txt')
      .field('relativePaths', 'beta.txt')
      .attach('files', Buffer.from('alpha', 'utf8'), {
        filename: 'alpha.txt',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from('beta', 'utf8'), {
        filename: 'beta.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传 2 个文件成功',
      data: expect.objectContaining({
        targetPath: '/docs',
        uploadedCount: 2,
      }),
    })

    expect(await readFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'utf8')).toBe('alpha')
    expect(await readFile(path.join(context.fileRoot, 'docs', 'beta.txt'), 'utf8')).toBe('beta')
  })

  it('POST /api/file/upload 应支持文件夹上传并保留相对路径', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .field('relativePaths', 'assets/readme.txt')
      .field('relativePaths', 'assets/images/logo.svg')
      .attach('files', Buffer.from('doc', 'utf8'), {
        filename: 'readme.txt',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from('<svg />', 'utf8'), {
        filename: 'logo.svg',
        contentType: 'image/svg+xml',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传 2 个文件成功',
      data: expect.objectContaining({
        uploadedCount: 2,
      }),
    })

    expect(await readFile(path.join(context.fileRoot, 'docs', 'assets', 'readme.txt'), 'utf8')).toBe('doc')
    expect(await readFile(path.join(context.fileRoot, 'docs', 'assets', 'images', 'logo.svg'), 'utf8')).toBe('<svg />')
  })

  it('POST /api/file/upload 应恢复批量上传中的 macOS 中文乱码文件名', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .attach('files', Buffer.from('hello file', 'utf8'), {
        filename: createMojibakeFilename(macosChineseFilename),
        contentType: 'text/plain',
      })
      .field('relativePaths', macosChineseFilename)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '上传文件成功',
      data: expect.objectContaining({
        uploadedCount: 1,
        uploaded: [
          expect.objectContaining({
            name: macosChineseFilename,
            relativePath: `/docs/${macosChineseFilename}`,
            type: 'file',
          }),
        ],
      }),
    })
  })

  it('POST /api/file/upload 遇到冲突时应整批拒绝', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'old')

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .field('relativePaths', 'alpha.txt')
      .field('relativePaths', 'beta.txt')
      .attach('files', Buffer.from('new-alpha', 'utf8'), {
        filename: 'alpha.txt',
        contentType: 'text/plain',
      })
      .attach('files', Buffer.from('beta', 'utf8'), {
        filename: 'beta.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      code: 409,
      msg: '目标目录下已存在同名文件或文件夹',
    })
    expect(await readFile(path.join(context.fileRoot, 'docs', 'alpha.txt'), 'utf8')).toBe('old')
    await expect(stat(path.join(context.fileRoot, 'docs', 'beta.txt'))).rejects.toBeTruthy()
  })

  it('POST /api/file/upload 相对路径越界时应拒绝上传', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload')
      .field('targetPath', '/docs')
      .field('relativePaths', '../escape.txt')
      .attach('files', Buffer.from('escape', 'utf8'), {
        filename: 'escape.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
      msg: '上传相对路径不合法',
    })
    await expect(stat(path.join(context.fileRoot, 'escape.txt'))).rejects.toBeTruthy()
  })

  it('POST /api/file/move 应支持移动文件', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await mkdir(path.join(context.fileRoot, 'archive'))
    await writeFile(path.join(context.fileRoot, 'docs', 'report.md'), '# report')

    const res = await request(app).post('/api/file/move').send({
      sourcePath: '/docs/report.md',
      destinationPath: '/archive',
    })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '移动文件成功',
      data: expect.objectContaining({
        name: 'report.md',
        relativePath: '/archive/report.md',
        type: 'file',
      }),
    })
    expect(await readFile(path.join(context.fileRoot, 'archive', 'report.md'), 'utf8')).toBe('# report')
  })

  it('POST /api/file/move 应拒绝移动到子目录', async () => {
    await mkdir(path.join(context.fileRoot, 'docs', 'nested'), { recursive: true })

    const res = await request(app).post('/api/file/move').send({
      sourcePath: '/docs',
      destinationPath: '/docs/nested',
    })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
      msg: '不允许将文件夹移动到自身或其子目录中',
    })
  })

  it('POST /api/file/move 应拒绝目标同名冲突', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await mkdir(path.join(context.fileRoot, 'archive'))
    await writeFile(path.join(context.fileRoot, 'docs', 'report.md'), '# old')
    await writeFile(path.join(context.fileRoot, 'archive', 'report.md'), '# exists')

    const res = await request(app).post('/api/file/move').send({
      sourcePath: '/docs/report.md',
      destinationPath: '/archive',
    })

    expect(res.status).toBe(409)
    expect(res.body).toMatchObject({
      code: 409,
      msg: '目标文件夹下已存在同名文件或文件夹',
    })
  })

  it('GET /api/file/preview 应返回受控预览内容', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')

    const res = await request(app)
      .get('/api/file/preview')
      .query({
        targetPath: '/docs/guide.md',
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.text).toBe('# guide')
  })

  it('GET /api/file/preview 应支持 Range 分段预览', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')

    const res = await request(app)
      .get('/api/file/preview')
      .query({
        targetPath: '/docs/guide.md',
      })
      .set('Range', 'bytes=0-4')

    expect(res.status).toBe(206)
    expect(res.headers['accept-ranges']).toBe('bytes')
    expect(res.headers['content-range']).toBe('bytes 0-4/7')
    expect(res.headers['content-length']).toBe('5')
    expect(res.text).toBe('# gui')
  })

  it('GET /api/file/preview 应拒绝无效的 Range 请求', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')

    const res = await request(app)
      .get('/api/file/preview')
      .query({
        targetPath: '/docs/guide.md',
      })
      .set('Range', 'bytes=99-100')

    expect(res.status).toBe(416)
    expect(res.headers['accept-ranges']).toBe('bytes')
    expect(res.headers['content-range']).toBe('bytes */7')
    expect(res.body).toMatchObject({
      code: 416,
      msg: '请求的范围无效',
    })
  })

  it('GET /api/file/preview 应支持中文路径文件预览', async () => {
    const folder1 = '知识库'
    const folder2 = '工具安装'
    const filename = '使用内网穿透技术实现小龙虾自由.md'
    await mkdir(path.join(context.fileRoot, folder1, folder2), { recursive: true })
    await writeFile(path.join(context.fileRoot, folder1, folder2, filename), '# 中文预览')

    const res = await request(app)
      .get('/api/file/preview')
      .query({
        targetPath: `/${folder1}/${folder2}/${filename}`,
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.text).toBe('# 中文预览')
  })

  it('GET /api/file/preview 应拒绝越界路径', async () => {
    const res = await request(app)
      .get('/api/file/preview')
      .query({
        targetPath: '/../outside.txt',
      })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
      msg: '目标路径超出 file 根目录范围',
    })
  })

  it('DELETE /api/file 应将文件移动到 rubbish', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'old.txt'), 'old')

    const res = await request(app).delete('/api/file').send({
      targetPath: '/docs/old.txt',
    })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      msg: '删除文件成功',
      data: expect.objectContaining({
        name: 'old.txt',
        relativePath: '/docs/old.txt',
        type: 'file',
      }),
    })

    const buckets = await readdir(context.rubbishRoot)
    expect(buckets).toHaveLength(1)

    const rubbishFilePath = path.join(context.rubbishRoot, buckets[0], 'docs', 'old.txt')
    const movedStats = await stat(rubbishFilePath)
    expect(movedStats.isFile()).toBe(true)
  })

  it('DELETE /api/file should support targetPath from query string', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'query.txt'), 'query-delete')

    const res = await request(app)
      .delete('/api/file')
      .query({
        targetPath: '/docs/query.txt',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      code: 200,
      data: expect.objectContaining({
        name: 'query.txt',
        relativePath: '/docs/query.txt',
        type: 'file',
      }),
    })

    const buckets = await readdir(context.rubbishRoot)
    expect(buckets.length).toBeGreaterThan(0)
  })

  it('POST /api/file/upload/chunk should support chunked upload for a large file', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const uploadId = 'chunk-upload-success'
    const firstChunk = Buffer.from('hello ', 'utf8')
    const secondChunk = Buffer.from('world', 'utf8')

    const firstRes = await request(app)
      .post('/api/file/upload/chunk')
      .field('targetPath', '/docs')
      .field('relativePath', 'large.txt')
      .field('uploadId', uploadId)
      .field('chunkIndex', '0')
      .field('totalChunks', '2')
      .attach('chunk', firstChunk, {
        filename: 'large.txt.part0',
        contentType: 'application/octet-stream',
      })

    expect(firstRes.status).toBe(200)
    expect(firstRes.body).toMatchObject({
      code: 200,
      data: {
        uploadId,
        chunkIndex: 0,
        receivedChunks: 1,
        totalChunks: 2,
      },
    })

    const secondRes = await request(app)
      .post('/api/file/upload/chunk')
      .field('targetPath', '/docs')
      .field('relativePath', 'large.txt')
      .field('uploadId', uploadId)
      .field('chunkIndex', '1')
      .field('totalChunks', '2')
      .attach('chunk', secondChunk, {
        filename: 'large.txt.part1',
        contentType: 'application/octet-stream',
      })

    expect(secondRes.status).toBe(200)
    expect(secondRes.body).toMatchObject({
      code: 200,
      data: {
        uploadId,
        chunkIndex: 1,
        receivedChunks: 2,
        totalChunks: 2,
      },
    })

    const completeRes = await request(app).post('/api/file/upload/chunk/complete').send({
      targetPath: '/docs',
      relativePath: 'large.txt',
      uploadId,
      totalChunks: 2,
    })

    expect(completeRes.status).toBe(200)
    expect(completeRes.body).toMatchObject({
      code: 200,
      data: expect.objectContaining({
        targetPath: '/docs',
        uploadedCount: 1,
        uploaded: [
          expect.objectContaining({
            name: 'large.txt',
            relativePath: '/docs/large.txt',
          }),
        ],
      }),
    })

    expect(await readFile(path.join(context.fileRoot, 'docs', 'large.txt'), 'utf8')).toBe('hello world')
  })

  it('POST /api/file/upload/chunk should reject out-of-order chunks', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .post('/api/file/upload/chunk')
      .field('targetPath', '/docs')
      .field('relativePath', 'large.txt')
      .field('uploadId', 'chunk-upload-invalid-order')
      .field('chunkIndex', '1')
      .field('totalChunks', '2')
      .attach('chunk', Buffer.from('world', 'utf8'), {
        filename: 'large.txt.part1',
        contentType: 'application/octet-stream',
      })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
    })
  })

  it('POST /api/file/upload/chunk/complete should reject conflicts on merge', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'large.txt'), 'old')

    const uploadId = 'chunk-upload-conflict'

    await request(app)
      .post('/api/file/upload/chunk')
      .field('targetPath', '/docs')
      .field('relativePath', 'large.txt')
      .field('uploadId', uploadId)
      .field('chunkIndex', '0')
      .field('totalChunks', '1')
      .attach('chunk', Buffer.from('new', 'utf8'), {
        filename: 'large.txt.part0',
        contentType: 'application/octet-stream',
      })
      .expect(200)

    const completeRes = await request(app).post('/api/file/upload/chunk/complete').send({
      targetPath: '/docs',
      relativePath: 'large.txt',
      uploadId,
      totalChunks: 1,
    })

    expect(completeRes.status).toBe(409)
    expect(await readFile(path.join(context.fileRoot, 'docs', 'large.txt'), 'utf8')).toBe('old')
  })

  it('GET /api/file/download should return attachment download response for a file', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))
    await writeFile(path.join(context.fileRoot, 'docs', 'guide.md'), '# guide')

    const res = await request(app)
      .get('/api/file/download')
      .query({
        targetPath: '/docs/guide.md',
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/markdown')
    expect(res.headers['content-disposition']).toContain('attachment;')
    expect(res.headers['content-disposition']).toContain("filename*=UTF-8''guide.md")
    expect(res.text).toBe('# guide')
  })

  it('GET /api/file/download should reject downloading a folder', async () => {
    await mkdir(path.join(context.fileRoot, 'docs'))

    const res = await request(app)
      .get('/api/file/download')
      .query({
        targetPath: '/docs',
      })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
      msg: expect.any(String),
    })
  })

  it('GET /api/file/download should reject escaped paths', async () => {
    const res = await request(app)
      .get('/api/file/download')
      .query({
        targetPath: '/../outside.txt',
      })

    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      code: 400,
      msg: expect.any(String),
    })
  })
})
