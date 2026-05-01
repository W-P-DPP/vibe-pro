import { jest } from '@jest/globals'
import { mkdtemp, mkdir, readFile, readdir, rm, stat, unlink as unlinkFile, writeFile } from 'fs/promises'
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
        stat,
        cp: async () => {
          throw new Error('cp should not be used for files')
        },
        rm,
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

  it('falls back to recursive copy and remove when directory rename hits EXDEV', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'file-repository-unit-dir-'))
    const sourcePath = path.join(root, 'source-dir')
    const nestedDir = path.join(sourcePath, 'nested')
    const destinationPath = path.join(root, 'target-dir')

    await mkdir(nestedDir, { recursive: true })
    await writeFile(path.join(sourcePath, 'root.txt'), 'root', 'utf8')
    await writeFile(path.join(nestedDir, 'child.txt'), 'child', 'utf8')

    const renameMock = jest.fn(async () => {
      throw Object.assign(new Error('cross-device link not permitted'), { code: 'EXDEV' })
    })
    const cpMock = jest.fn(async (from: string, to: string) => {
      await mkdir(path.join(to, 'nested'), { recursive: true })
      await writeFile(path.join(to, 'root.txt'), await readFile(path.join(from, 'root.txt')))
      await writeFile(path.join(to, 'nested', 'child.txt'), await readFile(path.join(from, 'nested', 'child.txt')))
    })
    const rmMock = jest.fn(async (target: string) => {
      await rm(target, { recursive: true, force: true })
    })
    const copyFileMock = jest.fn(async () => {
      throw new Error('copyFile should not be used for directories')
    })
    const unlinkMock = jest.fn(async () => {
      throw new Error('unlink should not be used for directories')
    })

    try {
      await moveFileSystemEntry(sourcePath, destinationPath, {
        rename: renameMock,
        stat,
        cp: cpMock,
        rm: rmMock,
        copyFile: copyFileMock,
        unlink: unlinkMock,
      })

      expect(renameMock).toHaveBeenCalledWith(sourcePath, destinationPath)
      expect(cpMock).toHaveBeenCalledWith(sourcePath, destinationPath, { recursive: true })
      expect(rmMock).toHaveBeenCalledWith(sourcePath, { recursive: true, force: true })
      await expect(stat(sourcePath)).rejects.toBeTruthy()
      await expect(readdir(destinationPath)).resolves.toEqual(expect.arrayContaining(['nested', 'root.txt']))
      await expect(readFile(path.join(destinationPath, 'nested', 'child.txt'), 'utf8')).resolves.toBe('child')
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
