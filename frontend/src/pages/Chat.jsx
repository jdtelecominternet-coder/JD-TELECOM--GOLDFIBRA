import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import api from '../services/api';
import { MessageCircle, Send, Circle, Search, ArrowLeft } from 'lucide-react';

function Avatar({ user, size = 'sm', online }) {
  const s = size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base';
  return (
    <div className="relative flex-shrink-0">
      <div className={`${s} rounded-full flex items-center justify-center overflow-hidden`}
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
        {user?.photo_url
          ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
          : <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name?.[0] || '?'}</span>}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full`}
          style={{ background: online ? '#4ade80' : 'var(--text-muted)', border: '2px solid var(--bg-card)' }} />
      )}
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const { messages, loadHistory, sendMessage, sendTyping, typing, isOnline, clearUnread, setActiveConv, unreadByUser } = useChat();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  async function loadContacts() {
    try {
      const r = await api.get('/chat/contacts');
      setContacts(r.data);
    } catch {}
    finally { setLoading(false); }
  }

  async function selectContact(contact) {
    setSelected(contact);
    setMobileView('chat');
    setActiveConv(contact.id); // marca conversa como ativa para suprimir toast
    try {
      const r = await api.get(`/chat/history/${contact.id}`);
      loadHistory(contact.id, r.data);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
      clearUnread(contact.id);
    } catch {}
    inputRef.current?.focus();
  }

  // Ao desmontar ou fechar conversa, limpar conversa ativa
  useEffect(() => {
    return () => setActiveConv(null);
  }, []);

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected, messages]);

  useEffect(() => {
    if (!selected) return;
    const msgs = messages[selected.id] || [];
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.sender_id === selected.id) {
      api.get(`/chat/history/${selected.id}`).catch(() => {});
      setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, unread: 0 } : c));
    }
  }, [messages]);

  function handleSend() {
    if (!input.trim() || !selected) return;
    sendMessage(selected.id, input.trim());
    sendTyping(selected.id, false);
    setInput('');
    inputRef.current?.focus();
  }

  function handleTyping(val) {
    setInput(val);
    if (!selected) return;
    sendTyping(selected.id, true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(selected.id, false), 1500);
  }

  const convMessages = selected ? (messages[selected.id] || []) : [];
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.jd_id.includes(search)
  );

  const roleLabel = { admin: 'Administrador', tecnico: 'Técnico' };

  function formatTime(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function groupByDate(msgs) {
    const groups = [];
    let lastDate = null;
    msgs.forEach(m => {
      const d = new Date(m.created_at).toLocaleDateString('pt-BR');
      if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d; }
      groups.push({ type: 'msg', ...m });
    });
    return groups;
  }

  return (
    <div className="h-[calc(100vh-9rem)] flex gap-0 rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      {/* Contacts list */}
      <div className={`flex flex-col w-full md:w-80 flex-shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Chat Interno</h1>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="input pl-9 text-sm py-1.5" />
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-sm px-4" style={{ color: 'var(--text-muted)' }}>
              {user.role === 'tecnico' ? 'Nenhum administrador disponível' : 'Nenhum técnico cadastrado'}
            </div>
          ) : (
            filteredContacts.map(c => {
              const online = isOnline(c.id);
              const lastMsg = (messages[c.id] || []).slice(-1)[0];
              const isTypingNow = typing[c.id];
              const isActive = selected?.id === c.id;

              return (
                <button key={c.id} onClick={() => selectContact(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: isActive ? 'var(--bg-input)' : 'transparent'
                  }}>
                  <Avatar user={c} online={online} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      {lastMsg && <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatTime(lastMsg.created_at)}</span>}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {isTypingNow
                          ? <span style={{ color: '#4ade80' }} className="italic">digitando...</span>
                          : lastMsg
                            ? (lastMsg.sender_id === user.id ? 'Você: ' : '') + lastMsg.message
                            : <span className="italic">{roleLabel[c.role]} • {c.jd_id}</span>}
                      </p>
                      {(c.unread > 0 || (unreadByUser[c.id] || 0) > 0) && (
                        <span className="text-xs font-black rounded-full min-w-5 h-5 px-1 flex items-center justify-center flex-shrink-0"
                          style={{ background: '#ef4444', color: '#fff' }}>
                          {(c.unread || 0) + (unreadByUser[c.id] || 0)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Circle className="w-2 h-2 flex-shrink-0" style={{ fill: online ? '#4ade80' : 'var(--text-muted)', color: online ? '#4ade80' : 'var(--text-muted)' }} />
                      <span className="text-xs" style={{ color: online ? '#4ade80' : 'var(--text-muted)' }}>{online ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 flex flex-col min-w-0 ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
              <MessageCircle className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Selecione uma conversa</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {user.role === 'tecnico'
                ? 'Escolha um administrador para iniciar o chat'
                : 'Escolha um técnico para conversar'}
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <button onClick={() => setMobileView('list')}
                className="md:hidden p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}>
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar user={selected} size="md" online={isOnline(selected.id)} />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{selected.name}</p>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-2 h-2 flex-shrink-0"
                    style={{ fill: isOnline(selected.id) ? '#4ade80' : 'var(--text-muted)', color: isOnline(selected.id) ? '#4ade80' : 'var(--text-muted)' }} />
                  <span className="text-xs" style={{ color: isOnline(selected.id) ? '#4ade80' : 'var(--text-muted)' }}>
                    {typing[selected.id] ? 'digitando...' : isOnline(selected.id) ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>• {roleLabel[selected.role]} • {selected.jd_id}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {convMessages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full text-sm text-center">
                  <div style={{ color: 'var(--text-muted)' }}>
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma mensagem ainda.</p>
                    <p className="text-xs mt-1">Diga olá para {selected.name.split(' ')[0]}!</p>
                  </div>
                </div>
              ) : (
                groupByDate(convMessages).map((item, i) => {
                  if (item.type === 'date') {
                    return (
                      <div key={`date-${i}`} className="flex items-center gap-3 py-3">
                        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                        <span className="text-xs px-2" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                      </div>
                    );
                  }
                  const isMine = item.sender_id === user.id;
                  return (
                    <div key={item.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                        <div className="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words"
                          style={isMine
                            ? { background: 'var(--accent)', color: 'var(--bg-main)', fontWeight: 500, borderBottomRightRadius: '4px' }
                            : { background: 'var(--bg-input)', color: 'var(--text-primary)', borderBottomLeftRadius: '4px' }}>
                          {item.message}
                        </div>
                        <span className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>{formatTime(item.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex items-end gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex-1 rounded-2xl px-4 py-2 transition-colors"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder={`Mensagem para ${selected.name.split(' ')[0]}...`}
                  className="w-full bg-transparent text-sm resize-none outline-none max-h-28 leading-relaxed"
                  rows={1}
                  style={{ fieldSizing: 'content', color: 'var(--text-primary)', caretColor: 'var(--accent)' }}
                />
              </div>
              <button onClick={handleSend} disabled={!input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--accent)' }}>
                <Send className="w-4 h-4" style={{ color: 'var(--bg-main)' }} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
