import { createRoot } from 'react-dom/client'
import { Component, type ReactNode } from 'react'
import { BrowserRouter } from 'react-router'
import { LanguageProvider } from './hooks/LanguageProvider'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#E2E8F0', fontFamily: 'sans-serif', background: '#0A0C10', minHeight: '100vh' }}>
          <h2 style={{ color: '#f87171' }}>⚠️ 页面渲染出错</h2>
          <pre style={{ background: '#1f2937', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, lineHeight: 1.5 }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <p style={{ marginTop: 16, color: '#6b7280' }}>请截图上面的错误信息发给开发者。</p>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red">Error: #root element not found</div>'
} else {
  try {
    createRoot(rootEl).render(
      <BrowserRouter>
        <LanguageProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </LanguageProvider>
      </BrowserRouter>,
    )
  } catch (err: any) {
    rootEl.innerHTML = `<div style="padding:20px">
      <h2 style="color:red">Render Error</h2>
      <pre style="background:#f5f5f5;padding:10px;overflow:auto">${err?.stack || err?.message || String(err)}</pre>
    </div>`
  }
}
