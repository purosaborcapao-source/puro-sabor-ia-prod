import React from 'react'

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ReactNode }>,
  State
> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-orange-50 p-8">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-2xl font-black text-stone-900 uppercase tracking-tight">
              Algo deu errado
            </h1>
            <p className="text-sm text-stone-500">
              {this.state.error?.message ?? 'Ocorreu um erro inesperado.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-5 py-3 bg-orange-500 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
