import { Component } from 'react'

// App state lives above this boundary, so retrying a broken view never clears
// the plan. A failed lazy import also lands here instead of blanking the page.
export default class WorkspaceBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="mc">
        <main className="mc-recovery" aria-labelledby="workspace-error-title" role="alert">
          <h1 id="workspace-error-title">The workspace could not be displayed</h1>
          <p>
            Your current plan has not been cleared. Retry the workspace, or reload to reopen the
            saved session.
          </p>
          <p>Reloading can discard changes that have not yet been saved.</p>
          <div className="mc-recovery__actions">
            <button type="button" onClick={() => this.setState({ failed: false })}>
              Retry workspace
            </button>
            <button type="button" onClick={() => window.location.reload()}>
              Reload app
            </button>
          </div>
        </main>
      </div>
    )
  }
}
