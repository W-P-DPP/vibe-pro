import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page-grid">
      <article className="panel-card">
        <span className="eyebrow">404</span>
        <h2>Page not found</h2>
        <p>The route does not exist yet. Use one of the wired demo pages.</p>
        <div className="action-row">
          <Link className="button button-primary" to="/">
            Back to home
          </Link>
          <Link className="button" to="/request">
            View request demo
          </Link>
        </div>
      </article>
    </section>
  )
}
