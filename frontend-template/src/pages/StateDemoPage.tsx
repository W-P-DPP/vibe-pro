import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCounterStore } from '../stores/counterStore'

export function StateDemoPage() {
  const count = useCounterStore((state) => state.count)
  const step = useCounterStore((state) => state.step)
  const increment = useCounterStore((state) => state.increment)
  const decrement = useCounterStore((state) => state.decrement)
  const reset = useCounterStore((state) => state.reset)
  const setStep = useCounterStore((state) => state.setStep)

  const handleStepChange = (event: ChangeEvent<HTMLInputElement>) => {
    setStep(Number(event.target.value))
  }

  return (
    <section className="page-grid">
      <article className="panel-card state-panel">
        <div>
          <span className="eyebrow">Zustand Store</span>
          <h2>Global state management example</h2>
          <p>
            This page writes directly into the shared store. Route changes do
            not reset the state because it is no longer tied to a single
            component.
          </p>
        </div>

        <div className="stat-strip">
          <div>
            <span className="stat-label">Count</span>
            <strong>{count}</strong>
          </div>
          <div>
            <span className="stat-label">Step</span>
            <strong>{step}</strong>
          </div>
        </div>

        <label className="field">
          <span>Step size</span>
          <input
            type="number"
            min="1"
            value={step}
            onChange={handleStepChange}
          />
        </label>

        <div className="action-row">
          <button className="button button-primary" onClick={increment}>
            +{step}
          </button>
          <button className="button" onClick={decrement}>
            -{step}
          </button>
          <button className="button button-ghost" onClick={reset}>
            Reset
          </button>
        </div>
      </article>

      <article className="info-card">
        <span className="eyebrow">Route Check</span>
        <h3>Go back and confirm the state persists</h3>
        <p>
          The counter now lives in a shared store, so the value remains stable
          while you navigate through the app.
        </p>
        <Link className="button" to="/">
          Back to home
        </Link>
      </article>
    </section>
  )
}
