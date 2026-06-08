import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { LanguageProvider } from './hooks/LanguageProvider'
import './index.css'
import App from './App.tsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:20px;color:red">Error: #root element not found</div>'
} else {
  try {
    createRoot(rootEl).render(
      <BrowserRouter>
        <LanguageProvider>
          <App />
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
