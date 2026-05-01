import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import {
  LayoutDashboard, Users, UserCheck, Package, ClipboardList,
  Wrench, FileBarChart, User, LogOut, Menu, Wifi, ChevronRight,
  MessageCircle, Sun, Moon, Settings, TrendingUp, ClipboardCheck, Bot, RotateCw,
  Radio, Network, Server, History, AlertCircle, CheckCircle
} from 'lucide-react';

const navItems = [
  // ─── 📊 PAINEL PRINCIPAL ───
  { to: '/',          label: 'Dashboard',        icon: LayoutDashboard, roles: ['admin','vendedor','tecnico'], end: true, section: 'painel' },
  
  // ─── 👥 GESTÃO DE PESSOAS ───
  { to: '/users',     label: 'Usuários',          icon: Users,           roles: ['admin'], section: 'pessoas' },
  { to: '/clients',   label: 'Clientes',          icon: UserCheck,       roles: ['admin','vendedor'], section: 'pessoas' },
  
  // ─── 💼 GESTÃO COMERCIAL ───
  { to: '/plans',     label: 'Planos',            icon: Package,         roles: ['admin','vendedor','tecnico'], section: 'comercial' },
  { to: '/sales',     label: 'Gestão de Vendas',       icon: TrendingUp,   roles: ['admin'], section: 'comercial' },
  { to: '/history',   label: 'Serviços Executados',    icon: History,      roles: ['admin'], section: 'comercial' },
  { to: '/solicitations', label: 'Solicitações',       icon: Radio,        roles: ['admin'], badge: 'solicitations', section: 'comercial' },
  
  // ─── 🛠️ OPERACIONAL / SERVIÇOS ───
  { to: '/orders',    label: 'Ordens de Serviço', icon: ClipboardList,   roles: ['admin','vendedor'], section: 'operacional' },
  { to: '/servico-rede',    label: 'Serviço de Rede',  icon: Network,      roles: ['admin', 'manutencao'], section: 'operacional' },
  { to: '/cto-ocorrencias', label: 'Ocorrências CTO',  icon: AlertCircle,  roles: ['admin'], section: 'operacional' },
  { to: '/quality-control', label: 'Controle de Qualidade', icon: CheckCircle, roles: ['admin', 'qualidade'], section: 'operacional' },
  
  // ─── 👨‍🔧 MÓDULO TÉCNICO ───
  { to: '/technical', label: 'Módulo Técnico',    icon: Wrench,          roles: ['admin','tecnico'], section: 'tecnico' },
  { to: '/stock-admin',     label: 'Estoque Técnico',       icon: Package,        roles: ['admin'], section: 'tecnico' },
  
  // ─── 📈 RELATÓRIOS ───
  { to: '/reports',   label: 'Relatórios',          icon: FileBarChart,   roles: ['admin'], section: 'relatorios' },
  { to: '/relatorio-tecnicos', label: 'Relatório de Técnicos', icon: ClipboardCheck, roles: ['admin'], section: 'relatorios' },
  
  // ─── 🌐 INFRAESTRUTURA / SISTEMA ───
  { to: '/providers',  label: 'Provedor / CORE',       icon: Server,       roles: ['admin'], masterOnly: true, section: 'infra' },
  
  // ─── 💬 COMUNICAÇÃO ───
  { to: '/chat',      label: 'Chat',                   icon: MessageCircle, roles: ['admin','tecnico','vendedor','manutencao','qualidade'], badge: true, section: 'comunicacao' },
  { to: '/ai',        label: 'Assistente IA',          icon: Bot,          roles: ['admin'], section: 'comunicacao' },
  
  // ─── ⚙️ ADMINISTRAÇÃO ───
  { to: '/settings',  label: 'Configurações',          icon: Settings,     roles: ['admin'], section: 'administracao' },
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

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Técnico', manutencao: 'Técnico de Rede', qualidade: 'Controle de Qualidade' };
const rolePill   = { admin: 'bg-blue-500/30 text-blue-200', vendedor: 'bg-sky-500/30 text-sky-200', tecnico: 'bg-emerald-500/30 text-emerald-200', manutencao: 'bg-purple-500/30 text-purple-200', qualidade: 'bg-amber-500/30 text-amber-200' };

import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Layout() {
  const { user, logout } = useAuth();
  const { pendingCount, syncing } = useOfflineSync();
  const nav = useNavigate();
  const location = useLocation();
  const mainRef = useRef(null);
  const chatCtx = useChat();
  const { theme, toggle } = useTheme();
  const unreadTotal = chatCtx?.unreadTotal || 0;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [logo, setLogo] = useState(null);
  const [roleGlobalPerms, setRoleGlobalPerms] = useState(null);
  const [pendingSolicitations, setPendingSolicitations] = useState(0);
  const prevSolCount = useRef(null);
  const prevOsCount = useRef(null);
  const [toast, setToast] = useState(null);
  // Alerta persistente de rede concluída (técnico B)
  const [redeAlert, setRedeAlert] = useState(null);
  // Contador de alertas de rede para admin
  const [redeAdminCount, setRedeAdminCount] = useState(0);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }

  function playNotification(type = 'new') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = type === 'new' ? [523, 659, 784, 1047] : [784, 659, 523, 392];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12);
        gain.gain.linearRampToValueAtTime(type === 'new' ? 0.3 : 0.2, ctx.currentTime + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
      });
    } catch {}
  }

  function playUrgentNotification() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Toca apenas uma vez — alerta limpo
      [784, 1047, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.15;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.4, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch {}
  }

  useEffect(() => {
    api.get('/settings').then(r => setLogo(r.data.logo_url)).catch(() => {});
    api.get('/settings/role-permissions').then(r => setRoleGlobalPerms(r.data)).catch(() => {});
    if (user?.role === 'admin') {
      const fetchSolicitations = () => {
        api.get('/solicitations').then(r => {
          const pending = r.data.filter(s => s.status === 'pendente').length;
          setPendingSolicitations(pending);
          if (prevSolCount.current !== null && pending > prevSolCount.current) {
            playNotification('new');
            showToast(`📩 Nova solicitação de cliente recebida!`, 'success');
            if (Notification.permission === 'granted') {
              new Notification('SysFlowCloudi', { body: 'Nova solicitação de cliente recebida!', icon: '/logo192.png' });
            }
          }
          prevSolCount.current = pending;
        }).catch(() => {});
      };
      Notification.requestPermission().catch(() => {});
      fetchSolicitations();
      const interval = setInterval(fetchSolicitations, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.role]);

  // Som e notificação para técnico
  useEffect(() => {
    if (user?.role !== 'tecnico') return;
    const check = () => {
      api.get('/users/me/stats').then(r => {
        const count = (r.data?.orders || []).length;
        if (prevOsCount.current !== null) {
          if (count > prevOsCount.current) {
            playNotification('new');
            showToast('📋 Nova Ordem de Serviço atribuída a você!', 'success');
            if (Notification.permission === 'granted') {
              new Notification('SysFlowCloudi', { body: 'Nova Ordem de Serviço atribuída a você!', icon: '/logo192.png' });
            }
          } else if (count < prevOsCount.current) {
            playNotification('remove');
            showToast('❌ Uma Ordem de Serviço foi removida.', 'error');
            if (Notification.permission === 'granted') {
              new Notification('SysFlowCloudi', { body: 'Uma Ordem de Serviço foi removida.', icon: '/logo192.png' });
            }
          }
        }
        prevOsCount.current = count;
      }).catch(() => {});
    };
    Notification.requestPermission().catch(() => {});
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [user?.role]);

  // Tempo real - ouvir eventos de OS via socket
  useEffect(() => {
    if (user?.role !== 'tecnico') return;
    const socket = chatCtx?.socket;
    if (!socket) return;
    const onNova = () => {
      playNotification('new');
      showToast('📋 Nova Ordem de Serviço atribuída a você!', 'success');
      if (Notification.permission === 'granted') {
        new Notification('SysFlowCloudi', { body: 'Nova Ordem de Serviço atribuída a você!', icon: '/logo192.png' });
      }
    };
    const onRemovida = () => {
      playNotification('remove');
      showToast('❌ Uma Ordem de Serviço foi removida.', 'error');
      if (Notification.permission === 'granted') {
        new Notification('SysFlowCloudi', { body: 'Uma Ordem de Serviço foi removida.', icon: '/logo192.png' });
      }
    };
    const onRedeEnviada = (data) => {
      playNotification('new');
      showToast(data.message || '⚠️ Ordem encaminhada para manutenção de rede.', 'success');
      if (Notification.permission === 'granted') {
        new Notification('⚠️ OS enviada para Rede', { body: data.message || 'Aguardando regularização da CTO.', icon: '/logo192.png' });
      }
    };
    socket.on('os:nova', onNova);
    socket.on('os:removida', onRemovida);
    socket.on('os:rede_enviada', onRedeEnviada);
    return () => { socket.off('os:nova', onNova); socket.off('os:removida', onRemovida); socket.off('os:rede_enviada', onRedeEnviada); };
  }, [user?.role, chatCtx?.socket]);

  // Notificações para técnico de rede e admin
  useEffect(() => {
    const socket = chatCtx?.socket;
    if (!socket) return;
    const onRedeNova = (data) => {
      if (user?.role === 'manutencao' || user?.role === 'admin') {
        playNotification('new');
        showToast(`🔧 Nova OS de Rede: ${data.problem_label || ''} — ${data.cto_number || ''}`, 'success');
        if (Notification.permission === 'granted') {
          new Notification('OS de Rede', { body: data.message || 'Nova ordem de manutenção', icon: '/logo192.png' });
        }
      }
    };
    const onRedeConcluida = (data) => {
      if (user?.role === 'tecnico') {
        playUrgentNotification();
        // Modal persistente — fica na tela até o técnico clicar
        setRedeAlert(data);
        if (Notification.permission === 'granted') {
          new Notification('✅ Problema de Rede Resolvido', { body: data.message || 'A OS pode ser reagendada pelo administrador.', icon: '/logo192.png' });
        }
      }
    };
    const onRedeConcluidaAdmin = (data) => {
      if (user?.role === 'admin') {
        playUrgentNotification();
        setRedeAdminCount(c => c + 1);
        showToast(`✅ OS de Rede ${data.readable_id || ''} concluída — CTO ${data.cto_number} por ${data.resolved_by}`, 'success');
        if (Notification.permission === 'granted') {
          new Notification('✅ OS de Rede Concluída', { body: `CTO ${data.cto_number} resolvida por ${data.resolved_by}. Reagendar OS.`, icon: '/logo192.png' });
        }
      }
    };
    socket.on('rede:nova_os', onRedeNova);
    socket.on('rede:concluida', onRedeConcluida);
    socket.on('rede:concluida_admin', onRedeConcluidaAdmin);
    return () => { socket.off('rede:nova_os', onRedeNova); socket.off('rede:concluida', onRedeConcluida); socket.off('rede:concluida_admin', onRedeConcluidaAdmin); };
  }, [user?.role, chatCtx?.socket]);

  // Detector de conexão online/offline
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine);
  useEffect(() => {
    const onOnline = () => {
      setIsOnlineStatus(true);
      showToast('✅ Conexão restaurada! Sincronizando...', 'success');
    };
    const onOffline = () => {
      setIsOnlineStatus(false);
      showToast('⚠️ Sem internet — modo offline ativo', 'error');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  function handleLogout() { logout(); nav('/login'); }

  // Scroll para o topo ao trocar de aba
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [location.pathname]);

  // Filtrar navItems respeitando permissions customizadas ou role padrão
  const filtered = navItems.filter(i => {
    if (!i.roles.includes(user?.role)) return false;
    if (i.masterOnly && user?.id !== 1) return false;
    if (user?.role === 'admin') return true;
    const key = routePermKey[i.to];
    if (!key) return true;
    if (user?.permissions && user.permissions[key] !== undefined) return user.permissions[key];
    return defaultPerms[user?.role]?.[key] !== false;
  });

  // Agrupar por setor
  const sectionLabels = {
    painel: '📊 Painel Principal',
    pessoas: '👥 Gestão de Pessoas',
    comercial: '💼 Gestão Comercial',
    operacional: '🛠️ Operacional / Serviços',
    tecnico: '👨‍🔧 Módulo Técnico',
    relatorios: '📈 Relatórios',
    infra: '🌐 Infraestrutura / Sistema',
    comunicacao: '💬 Comunicação',
    administracao: '⚙️ Administração'
  };
  const sectionOrder = ['painel', 'pessoas', 'comercial', 'operacional', 'tecnico', 'relatorios', 'infra', 'comunicacao', 'administracao'];
  const grouped = sectionOrder.map(sec => ({
    section: sec,
    label: sectionLabels[sec],
    items: filtered.filter(i => i.section === sec)
  })).filter(g => g.items.length > 0);

  const SidebarContent = ({ collapsed = false }) => (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-sidebar)' }}>
      {/* Logo */}
      <div className="p-5" style={{ borderBottom: '1px solid var(--border-sidebar)' }}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {logo
            ? <img src={logo} alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white/10 p-1 flex-shrink-0" />
            : <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0"><Wifi className="w-5 h-5 text-white" /></div>}
          {!collapsed && (
            <div>
              <p className="text-white font-black text-sm leading-tight">SysFlowCloudi</p>
              <p className="text-blue-300 text-xs font-semibold tracking-wider">SysFlowCloudi</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {grouped.map((group, idx) => (
          <div key={group.section} className={idx > 0 ? 'mt-4' : ''}>
            {!collapsed && (
              <div className="px-2 mb-3 text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: 'var(--text-sidebar)' }}>
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                  title={collapsed ? item.label : ''}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && (item.badge === true && unreadTotal > 0
                    ? <span className="bg-red-500 text-white text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
                    : item.badge === 'solicitations' && pendingSolicitations > 0
                    ? <span className="bg-orange-500 text-white text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{pendingSolicitations > 99 ? '99+' : pendingSolicitations}</span>
                    : item.to === '/servico-rede' && redeAdminCount > 0
                    ? <span className="bg-green-500 text-white text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center">{redeAdminCount > 99 ? '99+' : redeAdminCount}</span>
                    : <ChevronRight className="w-3 h-3 opacity-30" />)}
                  {collapsed && item.badge === true && unreadTotal > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Theme */}
      <div className="px-3 pb-2 space-y-0.5">
        <button onClick={toggle}
          className={`sidebar-item w-full ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? (theme === 'dark' ? 'Modo Dia' : 'Modo Noite') : ''}>
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          {!collapsed && <span>{theme === 'dark' ? 'Modo Dia' : 'Modo Noite'}</span>}
        </button>
      </div>

      {/* User */}
      <div className="p-3" style={{ borderTop: '1px solid var(--border-sidebar)' }}>
        <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} mb-1 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? (user?.name || 'Perfil') : ''}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.photo_url
              ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
              : <User className="w-5 h-5 text-white" />}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs opacity-60 font-mono">{user?.jd_id}</p>
            </div>
          )}
        </NavLink>
        {!collapsed && (
          <div className="px-1 mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rolePill[user?.role]}`}>
              {roleLabel[user?.role]}
            </span>
          </div>
        )}
        <button onClick={handleLogout}
          className={`sidebar-item w-full !text-red-300 hover:!bg-red-500/20 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Sair do Sistema' : ''}>
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sair do Sistema'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Toast de notificação */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, background: toast.type === 'success' ? '#16a34a' : '#dc2626',
          color: '#fff', padding: '12px 20px', borderRadius: '16px',
          fontWeight: 'bold', fontSize: '14px', textAlign: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          width: 'calc(100vw - 32px)', maxWidth: '380px',
          whiteSpace: 'normal', wordBreak: 'break-word'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Modal persistente — OS de rede concluída (técnico B) */}
      {redeAlert && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 24px',
            maxWidth: 420, width: '100%', textAlign: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
            border: '3px solid #22c55e',
            animation: 'pulse 1s infinite',
          }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', marginBottom: 10 }}>
              Problema de Rede Resolvido!
            </div>
            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>CTO</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#7c3aed' }}>{redeAlert.cto_number}</div>
                </div>
                <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>Sinal Final</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#10b981' }}>{redeAlert.signal_after} dBm</div>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>Problema</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{redeAlert.problem_label}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>Resolvido por</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{redeAlert.resolved_by}</div>
              </div>
              {redeAlert.os_readable_id && (
                <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 12px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700 }}>Sua OS ({redeAlert.os_readable_id})</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e' }}>Aguardando reagendamento pelo Administrador</div>
                </div>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>
              Aguarde o administrador reagendar sua ordem de serviço.
            </p>
            <button
              onClick={() => setRedeAlert(null)}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: '#22c55e', color: '#fff', fontWeight: 900,
                fontSize: 15, cursor: 'pointer',
              }}>
              Entendi — Fechar
            </button>
          </div>
        </div>
      )}
      {/* Banner offline fixo */}
      {!isOnlineStatus && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] py-2 text-center text-xs font-bold"
          style={{ background: '#dc2626', color: '#fff' }}>
          ⚠️ SEM INTERNET — Modo offline ativo. Dados salvos localmente.
        </div>
      )}
      {/* Indicador de sincronização pendente */}
      {isOnlineStatus && pendingCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-[9998] py-2 text-center text-xs font-bold"
          style={{ background: syncing ? '#7c3aed' : '#f59e0b', color: '#fff' }}>
          {syncing ? `🔄 Sincronizando dados offline...` : `💾 ${pendingCount} ação(ões) offline pendente(s). Aguardando sync...`}
        </div>
      )}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 relative"
        style={{
          width: sidebarCollapsed ? 64 : 256,
          transition: 'width 0.25s ease',
          overflow: 'hidden',
        }}
      >
        {/* Botão minimizar — só desktop */}
        <button
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          style={{
            position: 'absolute', top: 12, right: -14, zIndex: 10,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid var(--bg-sidebar)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" style={{ transform: 'rotate(180deg)' }} />}
        </button>
        <SidebarContent collapsed={sidebarCollapsed} />
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
            <span className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>SysFlowCloudi</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-lg lg:hidden"
              style={{ color: 'var(--text-secondary)' }}
              title="Girar tela"
              onClick={async () => {
                try {
                  const current = screen.orientation?.type || '';
                  const target = current.includes('portrait') ? 'landscape' : 'portrait';
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen().catch(() => {});
                  }
                  await screen.orientation.lock(target).catch(() => {});
                } catch {}
              }}
            >
              <RotateCw className="w-4 h-4" />
            </button>
            {['admin','tecnico'].includes(user?.role) && (
              <NavLink to="/chat" className="relative p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                <MessageCircle className="w-5 h-5" />
                {unreadTotal > 0 && <span className="absolute top-1 right-1 bg-blue-500 text-white text-xs font-black rounded-full w-4 h-4 flex items-center justify-center">{unreadTotal}</span>}
              </NavLink>
            )}
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-main)', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className="p-4 lg:p-6 max-w-7xl mx-auto"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
