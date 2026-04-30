// Proteção máxima contra cópia - Versão reforçada
(function() {
  'use strict';
  
  // Executar imediatamente antes de qualquer outro script
  const PROTECTION = {
    // Detectar DevTools
    detectDevTools: function() {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      
      if (widthThreshold || heightThreshold) {
        this.blockAccess();
        return true;
      }
      
      // Teste de performance
      const start = performance.now();
      debugger;
      const end = performance.now();
      
      if (end - start > 50) {
        this.blockAccess();
        return true;
      }
      
      return false;
    },
    
    // Bloquear acesso
    blockAccess: function() {
      document.documentElement.innerHTML = `
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>Bloqueado</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{background:#0f172a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;font-family:system-ui;text-align:center}
          .container{padding:40px}
          .lock{font-size:100px;margin-bottom:30px}
          h1{font-size:36px;margin-bottom:20px}
          p{font-size:18px;opacity:.8;margin-bottom:10px}
          .warn{background:rgba(239,68,68,.2);border:2px solid rgba(239,68,68,.5);border-radius:15px;padding:30px;margin-top:30px}
        </style></head>
        <body>
          <div class="container">
            <div class="lock">🔒</div>
            <h1>ACESSO NEGADO</h1>
            <p>Ferramentas de desenvolvedor detectadas!</p>
            <p>O sistema foi bloqueado por segurança.</p>
            <div class="warn">⚠️ Esta tentativa foi registrada.</div>
          </div>
        </body></html>
      `;
      throw new Error('BLOQUEADO');
    },
    
    // Iniciar proteção
    init: function() {
      const self = this;
      
      // Verificar a cada 100ms
      setInterval(function() {
        self.detectDevTools();
      }, 100);
      
      // Verificar imediatamente
      setTimeout(function() {
        self.detectDevTools();
      }, 0);
      
      // Bloquear teclas
      document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12') {
          e.preventDefault();
          self.blockAccess();
          return false;
        }
        // Ctrl+Shift+I/J/C
        if (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) {
          e.preventDefault();
          self.blockAccess();
          return false;
        }
        // Ctrl+U
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          return false;
        }
      }, true);
      
      // Bloquear clique direito
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      }, true);
      
      // Bloquear seleção
      document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
      }, true);
      
      // Desabilitar console
      console.log = function(){};
      console.warn = function(){};
      console.info = function(){};
      console.debug = function(){};
      console.clear();
    }
  };
  
  // Iniciar proteção imediatamente
  PROTECTION.init();
  
})();
