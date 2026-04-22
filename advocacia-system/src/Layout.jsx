import { useState } from 'react';
import { logout } from './store';
import {
  LayoutDashboard, FolderOpen, Users, FileText, DollarSign,
  MessageSquare, Archive, Scale, LogOut, Bell,
  Menu, X, Shield, ChevronRight, Crown
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'processos', label: 'Processos', icon: FolderOpen },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'contratos', label: 'Contratos', icon: FileText },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'arquivos', label: 'Arquivos', icon: Archive },
  { id: 'usuarios', label: 'Usuários', icon: Shield, adminOnly: true },
  { id: 'master', label: 'Painel Master', icon: Crown, masterOnly: true },
];

export default function Layout({ user, page, setPage, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    window.location.reload();
  }

  const visibleItems = menuItems.filter(m => {
    if (m.masterOnly) return user.role === 'master';
    if (m.adminOnly) return user.role === 'admin' || user.role === 'master';
    return true;
  });

  const Sidebar = ({ mobile }) => (
    <aside style={{
      width: '240px', minWidth: '240px',
      background: 'var(--black-2)',
      borderRight: '1px solid rgba(201,168,76,0.1)',
      display: 'flex', flexDirection: 'column',
      height: '100vh',
      ...(mobile ? {
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : '-260px',
        zIndex: 200, transition: 'left 0.3s ease',
        boxShadow: sidebarOpen ? '4px 0 40px rgba(0,0,0,0.8)' : 'none'
      } : {})
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={20} color="#0A0A0A" strokeWidth={1.5} />
          </div>
          <div>
            <div className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.12em', lineHeight: '1' }}>ADVOCACIA</div>
            <div style={{ color: 'var(--white-dim)', fontSize: '10px', letterSpacing: '0.15em', marginTop: '3px' }}>GESTÃO JURÍDICA</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isMaster = item.id === 'master';
          return (
            <div key={item.id}>
              {isMaster && <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', margin: '8px 0' }} />}
              <div className={`sidebar-item ${page === item.id ? 'active' : ''}`}
                onClick={() => { setPage(item.id); setSidebarOpen(false); }}
                style={isMaster ? { color: page === item.id ? 'var(--gold)' : 'var(--gold-dark)', background: page === item.id ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.04)' } : {}}>
                <Icon size={17} />
                <span style={isMaster ? { fontFamily: 'Cinzel, serif', fontSize: '12px', letterSpacing: '0.05em' } : {}}>{item.label}</span>
                {page === item.id && <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--gold)' }} />}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--black-3)', borderRadius: '8px', marginBottom: '8px' }}>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#0A0A0A', fontSize: '14px', fontWeight: '700' }}>{user.name[0]}</span>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: 'var(--white)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ color: 'var(--gold)', fontSize: '11px', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {user.role === 'master' && <Crown size={10} />}
                {user.role === 'master' ? 'Master Admin' : user.role || 'cliente'}
              </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-outline" style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <LogOut size={14} /> Sair
        </button>
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block" style={{ display: window.innerWidth >= 768 ? 'block' : 'none' }}>
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 199 }} onClick={() => setSidebarOpen(false)} />}
      <div style={{ display: window.innerWidth < 768 ? 'block' : 'none' }}>
        <Sidebar mobile />
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{ background: 'var(--black-2)', borderBottom: '1px solid rgba(201,168,76,0.1)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)', display: window.innerWidth < 768 ? 'flex' : 'none', alignItems: 'center' }}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '14px', letterSpacing: '0.08em' }}>
              {visibleItems.find(m => m.id === page)?.label || 'Dashboard'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)', position: 'relative' }}>
              <Bell size={18} />
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--gold)', borderRadius: '50%' }} />
            </button>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#0A0A0A', fontSize: '13px', fontWeight: '700' }}>{user.name[0]}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--black)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
