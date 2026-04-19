import ReactMarkdown from 'react-markdown'
import { renderToStaticMarkup } from 'react-dom/server'

export function renderMarkdownToHtml(markdown: string) {
  return renderToStaticMarkup(
    <ReactMarkdown
      components={{
        a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
      }}
    >
      {markdown}
    </ReactMarkdown>,
  )
}
