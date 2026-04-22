import { useState, useEffect } from 'react';
import './index.css';
import { getCurrentUser, logout } from './store';
import Login from './Login';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Processos from './Processos';
import Clientes from './Clientes';
import Contratos from './Contratos';
import Financeiro from './Financeiro';
import Chat from './Chat';
import Arquivos from './Arquivos';
import Usuarios from './Usuarios';
import ClientPortal from './ClientPortal';
import MasterPanel from './MasterPanel';
import { Smartphone, X } from 'lucide-react';

function PWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <div className="install-banner">
      <Smartphone size={20} color="var(--gold)" />
      <div>
        <div style={{ color: 'var(--white)', fontSize: '13px', fontWeight: '500' }}>Instalar como App</div>
        <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>Adicionar à tela inicial</div>
      </div>
      <button className="btn-gold" onClick={() => { deferredPrompt?.prompt(); setShow(false); }} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px' }}>Instalar</button>
      <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={16} /></button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(getCurrentUser());
  const [page, setPage] = useState('dashboard');

  function handleLogin(u) { setUser(u); }
  function handleLogout() { logout(); setUser(null); }

  if (!user) return <Login onLogin={handleLogin} />;

  if (user.userType === 'client') {
    return (
      <>
        <ClientPortal user={user} onLogout={handleLogout} />
        <PWABanner />
      </>
    );
  }

  const pages = {
    dashboard: <Dashboard user={user} />,
    processos: <Processos user={user} />,
    clientes: <Clientes user={user} />,
    contratos: <Contratos user={user} />,
    financeiro: <Financeiro />,
    chat: <Chat user={user} />,
    arquivos: <Arquivos user={user} />,
    usuarios: <Usuarios user={user} />,
    master: <MasterPanel user={user} />,
  };

  return (
    <>
      <Layout user={user} page={page} setPage={setPage}>
        {pages[page] || pages.dashboard}
      </Layout>
      <PWABanner />
    </>
  );
}
