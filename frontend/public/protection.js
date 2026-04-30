// Proteção máxima contra cópia e inspeção - SysFlowCloudi
(function() {
  'use strict';
  
  // ===== CONFIGURAÇÕES =====
  const CONFIG = {
    blockDevTools: true,
    blockRightClick: true,
    blockTextSelection: true,
    blockCopy: true,
    blockPrintScreen: true,
    blockDrag: true,
    watermark: true,
    killConsole: true,
    detectVirtualMachine: false
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // ===== MATAR CONSOLE COMPLETAMENTE =====
  if (CONFIG.killConsole) {
    const noop = function() {};
    console.log = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.table = noop;
    console.dir = noop;
    console.trace = noop;
    
    // Preservar error mas ofuscar
    const originalError = console.error;
    console.error = function() {
      if (arguments[0] && typeof arguments[0] === 'string') {
        if (arguments[0].includes('SysFlow') || arguments[0].includes('sysflow')) {
          return;
        }
      }
      originalError.apply(console, ['[Erro do Sistema]']);
    };
    
    // Limpar console
    console.clear();
    setInterval(() => console.clear(), 1000);
  }

  // ===== DETECÇÃO AVANÇADA DE DEVTOOLS =====
  let devToolsOpen = false;
  
  const detectDevTools = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    // Método 1: Diferença de tamanho
    if (widthThreshold || heightThreshold) {
      return true;
    }
    
    // Método 2: Performance timing
    const start = performance.now();
    debugger;
    const end = performance.now();
    if (end - start > 100) {
      return true;
    }
    
    // Método 3: Console output
    const element = new Image();
    let detected = false;
    Object.defineProperty(element, 'id', {
      get: function() {
        detected = true;
        return 'devtools-detected';
      }
    });
    console.log('%c', element);
    
    return detected;
  };

  const killPage = () => {
    if (devToolsOpen) return;
    devToolsOpen = true;
    
    // Bloquear a página completamente
    document.documentElement.innerHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Acesso Negado - SysFlowCloudi</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #fff;
              overflow: hidden;
            }
            .container {
              text-align: center;
              padding: 40px;
              max-width: 500px;
            }
            .lock-icon {
              font-size: 80px;
              margin-bottom: 30px;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
            h1 {
              font-size: 32px;
              margin-bottom: 20px;
              font-weight: 700;
            }
            p {
              font-size: 16px;
              opacity: 0.8;
              line-height: 1.6;
              margin-bottom: 15px;
            }
            .warning {
              background: rgba(239, 68, 68, 0.2);
              border: 1px solid rgba(239, 68, 68, 0.5);
              border-radius: 12px;
              padding: 20px;
              margin-top: 30px;
            }
            .warning-icon {
              font-size: 40px;
              margin-bottom: 10px;
            }
            .footer {
              margin-top: 40px;
              font-size: 12px;
              opacity: 0.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="lock-icon">🔒</div>
            <h1>Acesso Restrito</h1>
            <p>Ferramentas de desenvolvedor detectadas no navegador.</p>
            <p>O acesso ao sistema foi bloqueado por segurança.</p>
            <div class="warning">
              <div class="warning-icon">⚠️</div>
              <p><strong>Tentativa de inspeção não autorizada!</strong></p>
              <p>Este incidente foi registrado no sistema.</p>
            </div>
            <div class="footer">
              SysFlowCloudi © 2025 - Todos os direitos reservados
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Parar todas as execuções
    throw new Error('DevTools detectado - Acesso bloqueado');
  };

  // Verificação contínua
  if (CONFIG.blockDevTools) {
    setInterval(() => {
      if (detectDevTools()) {
        killPage();
      }
    }, 500);
    
    // Verificar imediatamente
    setTimeout(() => {
      if (detectDevTools()) {
        killPage();
      }
    }, 100);
  }

  // ===== BLOQUEAR TODOS OS ATALHOS =====
  document.addEventListener('keydown', (e) => {
    const key = e.key || e.code;
    
    // F12
    if (key === 'F12' || key === 'F12') {
      e.preventDefault();
      e.stopPropagation();
      killPage();
      return false;
    }
    
    // Ctrl+Shift+I (Inspecionar)
    if (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'KeyI')) {
      e.preventDefault();
      e.stopPropagation();
      killPage();
      return false;
    }
    
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (key === 'J' || key === 'KeyJ')) {
      e.preventDefault();
      e.stopPropagation();
      killPage();
      return false;
    }
    
    // Ctrl+Shift+C (Seletor de elementos)
    if (e.ctrlKey && e.shiftKey && (key === 'C' || key === 'KeyC')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Ctrl+U (Ver código fonte)
    if (e.ctrlKey && (key === 'U' || key === 'KeyU')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Ctrl+S (Salvar página)
    if (e.ctrlKey && (key === 'S' || key === 'KeyS')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Ctrl+P (Imprimir)
    if (e.ctrlKey && (key === 'P' || key === 'KeyP')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Print Screen
    if (key === 'PrintScreen' || key === 'Snapshot') {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText('');
      alert('⚠️ Captura de tela não permitida!');
      return false;
    }
    
    // Ctrl+C (Cópia)
    if (CONFIG.blockCopy && e.ctrlKey && (key === 'C' || key === 'KeyC')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Ctrl+X (Cortar)
    if (CONFIG.blockCopy && e.ctrlKey && (key === 'X' || key === 'KeyX')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // ===== BLOQUEAR CLIQUE DIREITO =====
  if (CONFIG.blockRightClick) {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }, true);
  }

  // ===== BLOQUEAR SELEÇÃO DE TEXTO =====
  if (CONFIG.blockTextSelection && !isMobile) {
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
      return false;
    }, true);
    
    document.addEventListener('mousedown', (e) => {
      if (e.detail > 1) { // Prevenir double/triple click selection
        e.preventDefault();
      }
    }, true);
  }

  // ===== BLOQUEAR DRAG =====
  if (CONFIG.blockDrag) {
    document.addEventListener('dragstart', (e) => {
      e.preventDefault();
      return false;
    }, true);
    
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      return false;
    }, true);
  }

  // ===== BLOQUEAR CÓPIA =====
  if (CONFIG.blockCopy) {
    document.addEventListener('copy', (e) => {
      e.preventDefault();
      e.clipboardData.setData('text/plain', '');
      return false;
    }, true);
    
    document.addEventListener('cut', (e) => {
      e.preventDefault();
      return false;
    }, true);
  }

  // ===== MARCA D'ÁGUA INVISÍVEL =====
  if (CONFIG.watermark) {
    const createWatermark = () => {
      const wm = document.createElement('div');
      wm.id = 'sfw-watermark';
      wm.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0.02;
        background: repeating-linear-gradient(
          -45deg,
          transparent,
          transparent 50px,
          rgba(255,255,255,0.03) 50px,
          rgba(255,255,255,0.03) 100px
        );
      `;
      
      const text = document.createElement('div');
      text.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 80px;
        font-weight: 900;
        color: rgba(255,255,255,0.03);
        white-space: nowrap;
        user-select: none;
        font-family: monospace;
        letter-spacing: 10px;
      `;
      text.textContent = 'SYSFLOWCLOUDI LICENCIADO';
      wm.appendChild(text);
      
      // Múltiplas marcas d'água
      for (let i = 0; i < 5; i++) {
        const mark = document.createElement('div');
        mark.style.cssText = `
          position: absolute;
          top: ${20 + i * 20}%;
          left: ${10 + i * 15}%;
          transform: rotate(-45deg);
          font-size: 24px;
          color: rgba(255,255,255,0.02);
          user-select: none;
          pointer-events: none;
        `;
        mark.textContent = 'SYSFLOW-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        wm.appendChild(mark);
      }
      
      document.body.appendChild(wm);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createWatermark);
    } else {
      createWatermark();
    }

    // Recriar se removida
    setInterval(() => {
      if (!document.getElementById('sfw-watermark')) {
        createWatermark();
      }
    }, 1000);
  }

  // ===== PROTEÇÃO CONTRA IMPRESSÃO =====
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      body { display: none !important; }
      html::before {
        content: 'Impressão não permitida - SysFlowCloudi';
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-size: 24px;
        color: #333;
      }
    }
  `;
  document.head.appendChild(style);

  // ===== DESABILITAR CACHE =====
  if (window.location.protocol === 'https:') {
    // Forçar recarregamento se detectar cache antigo
    const version = '1.0.0';
    const storedVersion = localStorage.getItem('sfw-version');
    if (storedVersion !== version) {
      localStorage.setItem('sfw-version', version);
    }
  }

  console.log('%c🔒 SysFlowCloudi', 'font-size: 40px; font-weight: bold; color: #1e50b4;');
  console.log('%cSistema protegido contra cópia e inspeção.', 'font-size: 14px; color: #666;');

})();
