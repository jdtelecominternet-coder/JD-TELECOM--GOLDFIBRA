import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Forcar recarregamento sem cache a cada 30 segundos
setInterval(() => {
  window.location.reload(true);
}, 30000);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
