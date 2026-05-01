import { useEffect } from 'react';

export default function SystemProtection() {
  useEffect(() => {
    // Proteção contra inspeção em produção
    if (process.env.NODE_ENV === 'production') {
      // Desabilitar console
      const noop = () => {};
      console.log = noop;
      console.warn = noop;
      console.info = noop;
      console.debug = noop;
      
      // Manter console.error para erros críticos, mas ofuscar
      const originalError = console.error;
      console.error = (...args) => {
        // Só mostrar erros não relacionados ao sistema
        const errorStr = args.join(' ');
        if (!errorStr.includes('SysFlow') && !errorStr.includes('sysflow')) {
          originalError.apply(console, args);
        }
      };
    }

    // Adicionar classe ao body para estilos de proteção
    document.body.classList.add('sysflow-protected');

    // Detectar DevTools - DESATIVADO para permitir acesso em todos os dispositivos
    /*
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // Redirecionar ou mostrar mensagem
        document.body.innerHTML = `
          <div style="
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
            color: #fff;
            font-family: system-ui, -apple-system, sans-serif;
            text-align: center;
            padding: 20px;
          ">
            <div>
              <div style="font-size: 64px; margin-bottom: 20px;">🔒</div>
              <h1 style="margin: 0 0 10px 0; font-size: 28px;">Acesso Restrito</h1>
              <p style="margin: 0; opacity: 0.8; font-size: 16px;">Ferramentas de desenvolvedor detectadas.</p>
              <p style="margin-top: 20px; font-size: 12px; opacity: 0.5;">SysFlowCloudi © 2025</p>
            </div>
          </div>
        `;
      }
    };

    // Verificar periodicamente
    const interval = setInterval(detectDevTools, 1000);
    */

    // Bloquear atalhos - DESATIVADO
    /*
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I/J/C
      if (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (ver código fonte)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    */

    return () => {
      // clearInterval(interval);
      // document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('sysflow-protected');
    };
  }, []);

  return null; // Componente não renderiza nada visualmente
}
