import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getPostPreviews } from '../api/modules/posts'
import { RequestError } from '../api/request'
import type { PostPreview } from '../api/modules/posts'

type LoadState = 'idle' | 'loading' | 'success' | 'error'

export function RequestDemoPage() {
  const [posts, setPosts] = useState<PostPreview[]>([])
  const [status, setStatus] = useState<LoadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const loadPosts = async () => {
    try {
      setStatus('loading')
      setErrorMessage('')
      const data = await getPostPreviews(4)
      setPosts(data)
      setStatus('success')
    } catch (error) {
      const message =
        error instanceof RequestError
          ? error.message
          : 'Unable to complete the request.'

      setPosts([])
      setErrorMessage(message)
      setStatus('error')
    }
  }

  return (
    <section className="page-grid">
      <article className="panel-card request-panel">
        <div className="request-header">
          <div>
            <span className="eyebrow">Axios Layer</span>
            <h2>Centralized request management</h2>
            <p>
              Requests go through a shared instance with timeout, base URL,
              auth-token injection, and normalized error handling.
            </p>
          </div>
          <button className="button button-primary" onClick={loadPosts}>
            {status === 'idle' ? 'Load demo data' : 'Reload data'}
          </button>
        </div>

        <div className="stat-strip">
          <div>
            <span className="stat-label">Status</span>
            <strong className="status-value">{status}</strong>
          </div>
          <div>
            <span className="stat-label">Base URL</span>
            <strong className="status-value status-url">
              {import.meta.env.VITE_API_BASE_URL || 'jsonplaceholder.typicode.com'}
            </strong>
          </div>
        </div>

        {status === 'error' ? (
          <div className="feedback-box feedback-error">{errorMessage}</div>
        ) : null}

        {status === 'idle' ? (
          <div className="feedback-box">
            Click the button above to send the first demo request.
          </div>
        ) : null}

        {status === 'loading' ? (
          <div className="feedback-box">Loading posts...</div>
        ) : null}

        {status === 'success' ? (
          <div className="request-list">
            {posts.map((post) => (
              <article key={post.id} className="request-item">
                <span className="request-item-id">Post #{post.id}</span>
                <h3>{post.title}</h3>
                <p>{post.body}</p>
              </article>
            ))}
          </div>
        ) : null}
      </article>

      <article className="info-card">
        <span className="eyebrow">How To Use</span>
        <h3>Add new endpoint modules instead of raw axios calls</h3>
        <p>
          Keep API definitions in <code>src/api/modules</code>, call them from
          pages or hooks, and let <code>src/api/request.ts</code> own the
          interceptors.
        </p>
        <Link className="button" to="/">
          Back to home
        </Link>
      </article>
    </section>
  )
}
