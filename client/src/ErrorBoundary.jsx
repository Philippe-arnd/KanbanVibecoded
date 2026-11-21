import { Component } from 'react'
import { reportError } from './observability.js'

// Last-resort guard: a render error anywhere below shows this fallback instead of a blank page,
// and is reported to RUM (component stack only, no user content).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    reportError(error, { react: { componentStack: info?.componentStack?.slice(0, 2000) } })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-xl font-bold">Something went wrong.</p>
        <p className="text-sm">Your tasks are safe. Reload the page to continue.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="bg-[#89CFF0] text-black font-bold py-2 px-6 border-2 border-black shadow-[4px_4px_0px_black]"
        >
          RELOAD
        </button>
      </div>
    )
  }
}
