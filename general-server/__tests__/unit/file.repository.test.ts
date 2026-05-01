import { jest } from '@jest/globals'
import { mkdtemp, mkdir, readFile, rm, unlink as unlinkFile, writeFile } from 'fs/promises'
import os from 'node:os'
import path from 'node:path'
import { moveFileSystemEntry } from '../../src/file/file.repository.ts'

describe('moveFileSystemEntry', () => {
  it('falls back to copy and unlink when rename hits EXDEV', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'file-repository-unit-'))
    await mkdir(path.join(root, 'nested'), { recursive: true })

    const sourcePath = path.join(root, 'source.txt')
    const destinationPath = path.join(root, 'nested', 'target.txt')

    await writeFile(sourcePath, 'cross-device-move', 'utf8')

    const renameMock = jest.fn(async () => {
      throw Object.assign(new Error('cross-device link not permitted'), { code: 'EXDEV' })
    })
    const copyFileMock = jest.fn(async (from: string, to: string) => {
      const content = await readFile(from)
      await writeFile(to, content)
    })
    const unlinkMock = jest.fn(async (target: string) => {
      await unlinkFile(target)
    })

    try {
      await moveFileSystemEntry(sourcePath, destinationPath, {
        rename: renameMock,
        copyFile: copyFileMock,
        unlink: unlinkMock,
      })

      expect(renameMock).toHaveBeenCalledWith(sourcePath, destinationPath)
      expect(copyFileMock).toHaveBeenCalledWith(sourcePath, destinationPath)
      expect(unlinkMock).toHaveBeenCalledWith(sourcePath)
      await expect(readFile(sourcePath, 'utf8')).rejects.toBeTruthy()
      await expect(readFile(destinationPath, 'utf8')).resolves.toBe('cross-device-move')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
