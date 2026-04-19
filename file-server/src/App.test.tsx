import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { redirectToLoginPageMock } = vi.hoisted(() => ({
  redirectToLoginPageMock: vi.fn(),
}))

vi.mock('./lib/auth-session', async () => {
  const actual = await vi.importActual<typeof import('./lib/auth-session')>('./lib/auth-session')

  return {
    ...actual,
    redirectToLoginPage: redirectToLoginPageMock,
  }
})

import App from './App'
import { ThemeProvider } from './components/theme-provider'

function renderApp() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>,
  )
}

function jsonResponse(data: unknown, msg = '成功', status = 200) {
  return new Response(
    JSON.stringify({
      code: status,
      msg,
      data,
      timestamp: Date.now(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )
}

function textResponse(text: string, contentType = 'text/plain; charset=utf-8') {
  return new Response(text, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    redirectToLoginPageMock.mockReset()
    localStorage.clear()
    document.cookie = 'file_preview_token=; Max-Age=0; Path=/'
  })

  it('should switch preview when selecting file and folder', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('# guide', 'text/markdown; charset=utf-8'))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    expect(await screen.findByText('当前选中的是文件夹。你可以继续在左侧完成新建、上传、删除或拖动移动。')).toBeInTheDocument()
    const docsNode = (await screen.findByRole('button', { name: '树节点 docs' })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }
    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))

    await userEvent.click(await screen.findByRole('button', { name: '树节点 guide.md' }))

    expect(await screen.findByText('guide')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '树节点 docs' }))

    await waitFor(() => {
      expect(screen.queryByText('guide')).not.toBeInTheDocument()
    })
    expect(screen.getByText('当前选中的是文件夹。你可以继续在左侧完成新建、上传、删除或拖动移动。')).toBeInTheDocument()
  })

  it('should move file by drag and drop and keep moved path selected after refresh', async () => {
    const initialTree = [
      {
        name: 'docs',
        relativePath: '/docs',
        type: 'folder',
        children: [
          {
            name: 'report.md',
            relativePath: '/docs/report.md',
            type: 'file',
            size: 8,
            children: [],
          },
        ],
      },
      {
        name: 'archive',
        relativePath: '/archive',
        type: 'folder',
        children: [],
      },
    ]

    const movedTree = [
      {
        name: 'docs',
        relativePath: '/docs',
        type: 'folder',
        children: [],
      },
      {
        name: 'archive',
        relativePath: '/archive',
        type: 'folder',
        children: [
          {
            name: 'report.md',
            relativePath: '/archive/report.md',
            type: 'file',
            size: 8,
            children: [],
          },
        ],
      },
    ]

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(initialTree))
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          name: 'report.md',
          relativePath: '/archive/report.md',
          type: 'file',
          size: 8,
          children: [],
        },
        '移动文件成功',
      ),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(movedTree))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    const docsNode = (await screen.findByRole('button', { name: '树节点 docs' })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }
    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    const sourceButton = await screen.findByRole('button', { name: '树节点 report.md' })
    const sourceNode = sourceButton.closest('[draggable="true"]')
    const targetNode = (await screen.findByRole('button', { name: '树节点 archive' })).closest('[draggable="true"]')

    if (!sourceNode || !targetNode) {
      throw new Error('树节点未正确渲染')
    }

    fireEvent.dragStart(sourceNode)
    fireEvent.dragOver(targetNode)
    fireEvent.drop(targetNode)

    expect(await screen.findByText('移动文件成功')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('/archive/report.md').length).toBeGreaterThan(0)
    })
  })

  it('should show preview failure message when preview request fails', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'guide.md',
              relativePath: '/docs/guide.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(null, '读取预览文件失败', 500))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    const docsNode = (await screen.findByRole('button', { name: '树节点 docs' })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }
    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    await userEvent.click(await screen.findByRole('button', { name: '树节点 guide.md' }))

    expect(await screen.findByText('读取预览文件失败')).toBeInTheDocument()
  })

  it('should stream audio preview through direct preview url instead of fetching a blob first', async () => {
    localStorage.setItem('token', 'preview-token')
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'song.mp3',
              relativePath: '/docs/song.mp3',
              type: 'file',
              size: 1024,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('', 'audio/mpeg'))
    vi.stubGlobal('fetch', fetchMock)

    const view = renderApp()

    const docsNode = (await screen.findByRole('button', { name: /docs/ })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }
    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    await userEvent.click(await screen.findByRole('button', { name: /song\.mp3/ }))

    await waitFor(() => {
      expect(view.container.querySelector('audio')).not.toBeNull()
    })

    expect(view.container.querySelector('audio')?.getAttribute('src')).toBe(
      '/api/file/preview?targetPath=%2Fdocs%2Fsong.mp3',
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(document.cookie).toContain('file_preview_token=preview-token')
  })

  it('should reuse login session token for audio preview when raw token key is absent', async () => {
    localStorage.setItem(
      'login-template.auth',
      JSON.stringify({
        token: 'session-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 60_000,
      }),
    )
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'song.mp3',
              relativePath: '/docs/song.mp3',
              type: 'file',
              size: 1024,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('', 'audio/mpeg'))
    vi.stubGlobal('fetch', fetchMock)

    const view = renderApp()

    const docsNode = (await screen.findByRole('button', { name: /docs/ })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }
    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    await userEvent.click(await screen.findByRole('button', { name: /song\.mp3/ }))

    await waitFor(() => {
      expect(view.container.querySelector('audio')).not.toBeNull()
    })

    expect(view.container.querySelector('audio')?.getAttribute('src')).toBe(
      '/api/file/preview?targetPath=%2Fdocs%2Fsong.mp3',
    )
    expect(document.cookie).toContain('file_preview_token=session-token')
  })

  it('should redirect to login when initial tree loading returns 401', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse(null, '未登录', 401))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    await waitFor(() => {
      expect(redirectToLoginPageMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('登录状态已失效，请重新登录')).toBeInTheDocument()
  })

  it('should consume login handoff and load the initial tree without redirecting back to login', async () => {
    window.history.replaceState(
      {},
      '',
      '/file-server?spauth=%7B%22key%22%3A%22super-pro.auth-handoff%22%2C%22session%22%3A%7B%22token%22%3A%22handoff-token%22%2C%22tokenType%22%3A%22Bearer%22%2C%22expiresAt%22%3A4102444800000%7D%7D',
    )

    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [],
        },
      ]),
    )
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    expect(await screen.findByRole('button', { name: /docs/ })).toBeInTheDocument()
    expect(redirectToLoginPageMock).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/file/tree',
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    )
    expect(
      ((fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers).get(
        'Authorization',
      ),
    ).toBe('Bearer handoff-token')
    expect(window.location.search).toBe('')
    expect(localStorage.getItem('login-template.auth')).toContain(
      '"token":"handoff-token"',
    )
  })

  it('should expose full long names through titles in the tree without rendering the header path summary', async () => {
    const longFileName = 'this-is-a-very-long-file-name-used-for-hover-checking-and-layout-validation.md'
    const folderPath = '/nested-folder-with-a-very-long-name'
    const filePath = `${folderPath}/${longFileName}`
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'nested-folder-with-a-very-long-name',
          relativePath: folderPath,
          type: 'folder',
          children: [
            {
              name: longFileName,
              relativePath: filePath,
              type: 'file',
              size: 2048,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(textResponse('# preview', 'text/markdown; charset=utf-8'))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()

    const folderNode = (
      await screen.findByRole('button', { name: /nested-folder-with-a-very-long-name/ })
    ).closest('[draggable="true"]')
    if (!(folderNode instanceof HTMLElement)) {
      throw new Error('folder node was not rendered correctly')
    }

    await userEvent.click(within(folderNode).getByRole('button', { name: '展开目录' }))
    await userEvent.click(
      await screen.findByRole('button', { name: new RegExp(longFileName.replace(/\./g, '\\.')) }),
    )

    expect(screen.getByText(longFileName)).toHaveAttribute('title', longFileName)
    expect(screen.getAllByTitle(filePath).length).toBeGreaterThan(0)
    expect(screen.queryByText('当前选中')).not.toBeInTheDocument()
    expect(screen.queryByText('操作目录')).not.toBeInTheDocument()
  })

  it('should redirect to login when audio preview preflight returns 403', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'song.mp3',
              relativePath: '/docs/song.mp3',
              type: 'file',
              size: 1024,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(null, '未登录', 403))
    vi.stubGlobal('fetch', fetchMock)

    const view = renderApp()

    const docsNode = (await screen.findByRole('button', { name: /docs/ })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }

    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    await userEvent.click(await screen.findByRole('button', { name: /song\.mp3/ }))

    await waitFor(() => {
      expect(redirectToLoginPageMock).toHaveBeenCalledTimes(1)
    })
    expect(view.container.querySelector('audio')).toBeNull()
  })

  it('should redirect to login when deleting a file returns 401', async () => {
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        {
          name: 'docs',
          relativePath: '/docs',
          type: 'folder',
          children: [
            {
              name: 'report.md',
              relativePath: '/docs/report.md',
              type: 'file',
              size: 8,
              children: [],
            },
          ],
        },
      ]),
    )
    fetchMock.mockResolvedValueOnce(jsonResponse(null, '未登录', 401))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => true))

    renderApp()

    const docsNode = (await screen.findByRole('button', { name: /docs/ })).closest('[draggable="true"]')
    if (!(docsNode instanceof HTMLElement)) {
      throw new Error('docs 节点未正确渲染')
    }

    await userEvent.click(within(docsNode).getByRole('button', { name: '展开目录' }))
    const fileButton = await screen.findByRole('button', { name: /report\.md/ })
    const fileNode = fileButton.closest('[draggable="true"]')
    if (!(fileNode instanceof HTMLElement)) {
      throw new Error('report.md 节点未正确渲染')
    }

    await userEvent.click(fileButton)
    await userEvent.click(within(fileNode).getByRole('button', { name: /rubbish/ }))

    await waitFor(() => {
      expect(redirectToLoginPageMock).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText('登录状态已失效，请重新登录')).toBeInTheDocument()
  })
})
