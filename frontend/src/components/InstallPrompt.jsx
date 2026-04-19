import { useState, useEffect } from 'react';
import { Download, Share, Monitor } from 'lucide-react';

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export default function InstallPrompt() {
  const [show, setShow]     = useState(false);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone) return;

    if (window.__pwaPrompt) setPrompt(window.__pwaPrompt);

    const handler = (e) => {
      e.preventDefault();
      window.__pwaPrompt = e;
      setPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setShow(false));

    // Mostra imediatamente ao abrir
    setShow(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    const p = prompt || window.__pwaPrompt;
    if (p) {
      p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === 'accepted') setShow(false);
    }
  }

  if (!show) return null;

  const hasNativePrompt = !!(prompt || window.__pwaPrompt);

  // ── DESKTOP (PC / notebook) ──
  if (!isMobile) {
    return (
      <>
        <div onClick={() => setShow(false)} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          zIndex: 9998,
          backdropFilter: 'blur(6px)',
        }} />

        <div style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'linear-gradient(160deg, #0f2460 0%, #1a3a8f 60%, #0d1f55 100%)',
          borderRadius: '24px',
          padding: '40px 40px 32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
          border: '1px solid rgba(99,179,237,0.2)',
          width: '380px',
          animation: 'popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          textAlign: 'center',
        }}>
          <style>{`
            @keyframes popIn {
              from { transform: translate(-50%, -50%) scale(0.85); opacity: 0; }
              to   { transform: translate(-50%, -50%) scale(1);    opacity: 1; }
            }
          `}</style>

          <img src="/logo192.png" alt="JD Telecom" style={{
            width: '80px', height: '80px',
            borderRadius: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            margin: '0 auto 16px',
            display: 'block',
          }} />

          <p style={{ margin: '0 0 4px', fontWeight: 900, fontSize: '20px', color: '#fff' }}>
            Instalar JD Telecom
          </p>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
            Instale como aplicativo no seu computador<br />e acesse com um clique pela área de trabalho
          </p>

          {hasNativePrompt ? (
            <button onClick={handleInstall} style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              color: '#000',
              border: 'none',
              borderRadius: '14px',
              padding: '16px',
              fontWeight: 900,
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '10px',
              boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
            }}>
              <Download size={18} /> Instalar agora
            </button>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: '14px',
              padding: '14px',
              marginBottom: '14px',
              textAlign: 'left',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.8,
            }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Monitor size={14} /> Como instalar no PC:
              </p>
              <p style={{ margin: 0 }}>1. Clique nos <b>⋮ três pontos</b> do Chrome/Edge</p>
              <p style={{ margin: 0 }}>2. Clique em <b>"Instalar JD Telecom..."</b></p>
              <p style={{ margin: 0 }}>3. Confirme clicando em <b>Instalar ✅</b></p>
            </div>
          )}

          <button onClick={() => setShow(false)} style={{
            width: '100%',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            padding: '13px',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            Agora não
          </button>
        </div>
      </>
    );
  }

  // ── MOBILE (Android / iPhone) ──
  return (
    <>
      <div onClick={() => setShow(false)} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 9998,
        backdropFilter: 'blur(5px)',
      }} />

      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 9999,
        background: 'linear-gradient(160deg, #0f2460 0%, #1a3a8f 60%, #0d1f55 100%)',
        borderRadius: '28px 28px 0 0',
        padding: '32px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        border: '1px solid rgba(99,179,237,0.2)',
        animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        textAlign: 'center',
      }}>
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        <div style={{
          width: '40px', height: '4px',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: '9px',
          margin: '0 auto 24px',
        }} />

        <img src="/logo192.png" alt="JD Telecom" style={{
          width: '88px', height: '88px',
          borderRadius: '22px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          margin: '0 auto 16px',
          display: 'block',
        }} />

        <p style={{ margin: '0 0 6px', fontWeight: 900, fontSize: '22px', color: '#fff' }}>
          Instalar JD Telecom
        </p>
        <p style={{ margin: '0 0 28px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
          Adicione à sua tela inicial e acesse<br />como um aplicativo instalado
        </p>

        {/* Android com prompt nativo */}
        {!isIOS && hasNativePrompt && (
          <button onClick={handleInstall} style={{
            width: '100%',
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            color: '#000', border: 'none', borderRadius: '16px',
            padding: '18px', fontWeight: 900, fontSize: '16px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: '8px', marginBottom: '12px',
            boxShadow: '0 6px 24px rgba(245,158,11,0.45)',
          }}>
            <Download size={20} /> Instalar agora
          </button>
        )}

        {/* Android sem prompt */}
        {!isIOS && !hasNativePrompt && (
          <div style={{
            background: 'rgba(255,255,255,0.07)', borderRadius: '16px',
            padding: '16px', marginBottom: '16px', textAlign: 'left',
            fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8,
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '14px', color: '#fff' }}>
              Como instalar no Android:
            </p>
            <p style={{ margin: 0 }}>1. Toque nos <b>⋮ três pontos</b> do Chrome</p>
            <p style={{ margin: 0 }}>2. Toque em <b>"Adicionar à tela inicial"</b></p>
            <p style={{ margin: 0 }}>3. Confirme tocando em <b>Adicionar ✅</b></p>
          </div>
        )}

        {/* iOS */}
        {isIOS && (
          <div style={{
            background: 'rgba(255,255,255,0.07)', borderRadius: '16px',
            padding: '16px', marginBottom: '16px', textAlign: 'left',
            fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8,
          }}>
            <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: '14px', color: '#fff' }}>
              Como instalar no iPhone:
            </p>
            <p style={{ margin: 0 }}>1. Toque em <Share size={13} style={{ display:'inline', verticalAlign:'middle' }} /> <b>Compartilhar</b> no Safari</p>
            <p style={{ margin: 0 }}>2. Role e toque em <b>"Adicionar à Tela Início"</b></p>
            <p style={{ margin: 0 }}>3. Toque em <b>Adicionar ✅</b></p>
          </div>
        )}

        <button onClick={() => setShow(false)} style={{
          width: '100%',
          background: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.55)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px', padding: '15px',
          fontSize: '14px', cursor: 'pointer',
        }}>
          Agora não
        </button>
      </div>
    </>
  );
}
