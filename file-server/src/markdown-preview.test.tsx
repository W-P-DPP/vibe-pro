import { describe, expect, it } from 'vitest'
import { renderMarkdownToHtml } from './markdown-preview'

describe('renderMarkdownToHtml', () => {
  it('converts markdown into html markup before preview rendering', () => {
    const html = renderMarkdownToHtml('# 标题\n\n正文段落\n\n- 列表项\n\n[链接](https://example.com)')

    expect(html).toContain('<h1>标题</h1>')
    expect(html).toContain('<p>正文段落</p>')
    expect(html).toContain('<li>列表项</li>')
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('target="_blank"')
  })
})
