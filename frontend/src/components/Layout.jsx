import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import {
  LayoutDashboard, Users, UserCheck, Package, ClipboardList,
  Wrench, FileBarChart, User, LogOut, Menu, Wifi, ChevronRight,
  MessageCircle, Sun, Moon, ALargeSmall
} from 'lucide-react';

const navItems = [
  { to: '/',          label: 'Dashboard',        icon: LayoutDashboard, roles: ['admin','vendedor','tecnico'], end: true },
  { to: '/users',     label: 'Usuários',          icon: Users,           roles: ['admin'] },
  { to: '/clients',   label: 'Clientes',          icon: UserCheck,       roles: ['admin','vendedor'] },
  { to: '/plans',     label: 'Planos',            icon: Package,         roles: ['admin','vendedor','tecnico'] },
  { to: '/orders',    label: 'Ordens de Serviço', icon: ClipboardList,   roles: ['admin','vendedor'] },
  { to: '/technical', label: 'Módulo Técnico',    icon: Wrench,          roles: ['admin','tecnico'] },
  { to: '/reports',   label: 'Relatórios',        icon: FileBarChart,    roles: ['admin'] },
  { to: '/chat',      label: 'Chat',              icon: MessageCircle,   roles: ['admin','tecnico'], badge: true },
];

// Permissões padrão por role
const defaultPerms = {
  admin:    { users: true, clients: true, plans: true, orders: true, technical: true, reports: true, chat: true },
  vendedor: { users: false, clients: true, plans: true, orders: true, technical: false, reports: false, chat: false },
  tecnico:  { users: false, clients: false, plans: true, orders: false, technical: true, reports: false, chat: true },
};

// Mapa: to -> permissão key
const routePermKey = {
  '/users': 'users', '/clients': 'clients', '/plans': 'plans',
  '/orders': 'orders', '/technical': 'technical', '/reports': 'reports', '/chat': 'chat',
};

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico' };
const rolePill   = { admin: 'bg-blue-500/30 text-blue-200', vendedor: 'bg-sky-500/30 text-sky-200', tecnico: 'bg-emerald-500/30 text-emerald-200' };

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const chatCtx = useChat();
  const { theme, toggle } = useTheme();
  const unreadTotal = chatCtx?.unreadTotal || 0;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logo, setLogo] = useState(null);
  const [roleGlobalPerms, setRoleGlobalPerms] = useState(null);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'normal');

  useEffect(() => {
    document.documentElement.setAttribute('data-fontsize', fontSize);
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  function cycleFontSize() {
    setFontSize(f => f === 'normal' ? 'large' : f === 'large' ? 'xlarge' : 'normal');
  }

  useEffect(() => {
    api.get('/settings').then(r => setLogo(r.data.logo_url)).catch(() => {});
    api.get('/settings/role-permissions').then(r => setRoleGlobalPerms(r.data)).catch(() => {});
  }, []);

  function handleLogout() { logout(); nav('/login'); }

  // Filtrar navItems respeitando permissions customizadas ou role padrão
  const filtered = navItems.filter(i => {
    if (!i.roles.includes(user?.role)) return false;
    const key = routePermKey[i.to];
    if (!key) return true; // dashboard e profile sempre visíveis
    if (user?.permissions && user.permissions[key] !== undefined) return user.permissions[key];
    return defaultPerms[user?.role]?.[key] !== false;
  });

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Logo */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
        <div className="flex items-center gap-3">
          {logo
            ? <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1" />
            : <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Wifi className="w-5 h-5 text-white" /></div>}
          <div>
            <p className="text-white font-black text-sm leading-tight">JD TELECOM</p>
            <p className="text-blue-300 text-xs font-semibold tracking-wider">GOLD FIBRA</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {filtered.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}>
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && unreadTotal > 0
              ? <span className="bg-red-500 text-white text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
              : <ChevronRight className="w-3 h-3 opacity-30" />}
          </NavLink>
        ))}
      </nav>

      {/* Theme + Font size */}
      <div className="px-3 pb-2 space-y-0.5">
        <button onClick={toggle}
          className="sidebar-item w-full"
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>{theme === 'dark' ? 'Modo Dia' : 'Modo Noite'}</span>
        </button>
        <button onClick={cycleFontSize} className="sidebar-item w-full" title="Tamanho da fonte">
          <ALargeSmall className="w-4 h-4" />
          <span>Fonte: {fontSize === 'normal' ? 'Normal' : fontSize === 'large' ? 'Grande' : 'Extra Grande'}</span>
        </button>
      </div>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-sidebar)' }}>
        <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} mb-1`}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.photo_url
              ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
              : <User className="w-4 h-4 text-white" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs opacity-60 font-mono">{user?.jd_id}</p>
          </div>
        </NavLink>
        <div className="px-1 mb-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rolePill[user?.role]}`}>
            {roleLabel[user?.role]}
          </span>
        </div>
        <button onClick={handleLogout} className="sidebar-item w-full !text-red-300 hover:!bg-red-500/20">
          <LogOut className="w-4 h-4" /> Sair do Sistema
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 z-10"><SidebarContent /></aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>JD TELECOM</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {['admin','tecnico'].includes(user?.role) && (
              <NavLink to="/chat" className="relative p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <MessageCircle className="w-5 h-5" />
                {unreadTotal > 0 && <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center">{unreadTotal}</span>}
              </NavLink>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-main)' }}>
          <div className="p-4 lg:p-6 max-w-7xl mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
