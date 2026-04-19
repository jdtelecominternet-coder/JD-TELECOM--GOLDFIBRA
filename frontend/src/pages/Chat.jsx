import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Circle, Search, ArrowLeft, Camera, Mic, MicOff, X } from 'lucide-react';
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
  const [mobileView, setMobileView] = useState('list');
  const typingTimer = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecRef = useRef(null);
  const audioChunksRef = useRef([]);
  const photoInputRef = useRef(null);
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
    setActiveConv(contact.id);
    try {
      const r = await api.get(`/chat/history/${contact.id}`);
      loadHistory(contact.id, r.data);
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
      clearUnread(contact.id);
    } catch {}
    inputRef.current?.focus();
  }

  useEffect(() => { return () => setActiveConv(null); }, []);
  useEffect(() => { loadContacts(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected, messages]);
  useEffect(() => {
    if (!selected) return;
    const msgs = messages[selected.id] || [];
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg && lastMsg.sender_id === selected.id) {
      api.get(`/chat/history/${selected.id}`).catch(() => {});
      setContacts(prev => prev.map(c => c.id === selected.id ? { ...c, unread: 0 } : c));
    }
  }, [messages]);
  async function sendMedia(file, type) {
    if (!selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await api.post('/chat/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      sendMessage(selected.id, '', r.data.media_url, r.data.media_type);
    } catch { toast.error('Erro ao enviar arquivo'); }
    finally { setUploading(false); }
  }

  async function startRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error('Gravacao de audio nao suportada neste navegador');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Detectar formato suportado
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4','audio/aac']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';
      const ext = mimeType.includes('mp4') || mimeType.includes('aac') ? 'mp4'
        : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type });
        const file = new File([blob], `audio.${ext}`, { type });
        sendMedia(file, 'audio');
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start(100); // coleta chunks a cada 100ms
      mediaRecRef.current = rec;
      setRecording(true);
    } catch (err) {
      toast.error('Microfone: ' + (err.message || 'sem permissao'));
    }
  }

  function stopRecording() {
    if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') {
      mediaRecRef.current.stop();
    }
    setRecording(false);
  }
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
  const roleLabel = { admin: 'Administrador', tecnico: 'Tecnico', vendedor: 'Vendedor', manutencao: 'Téc. de Rede' };

  function formatTime(ts) {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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
      {/* Contacts */}
      <div className={`flex flex-col w-full md:w-80 flex-shrink-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}
        style={{ borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h1 className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>Chat Interno</h1>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contato..."
              className="input pl-9 text-sm py-1.5" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-sm px-4" style={{ color: 'var(--text-muted)' }}>
              {user.role === 'admin' ? 'Nenhum tecnico, vendedor ou técnico de rede cadastrado' : 'Nenhum administrador disponivel'}
            </div>
          ) : filteredContacts.map(c => {
            const online = isOnline(c.id);
            const lastMsg = (messages[c.id] || []).slice(-1)[0];
            const isTypingNow = typing[c.id];
            const isActive = selected?.id === c.id;
            return (
              <button key={c.id} onClick={() => selectContact(c)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                style={{ borderBottom: '1px solid var(--border)', background: isActive ? 'var(--bg-input)' : 'transparent' }}>
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
                          ? (lastMsg.sender_id === user.id ? 'Você: ' : '') + (lastMsg.media_type === 'image' ? '📷 Foto' : lastMsg.media_type === 'audio' ? '🎙️ Audio' : lastMsg.message)
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
          })}
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
              {user.role === 'admin' ? 'Escolha um tecnico ou vendedor para conversar' : 'Escolha um administrador para iniciar o chat'}
            </p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
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
                        <div className="rounded-2xl overflow-hidden"
                          style={isMine
                            ? { background: item.media_type ? 'transparent' : 'var(--accent)', borderBottomRightRadius: '4px' }
                            : { background: item.media_type ? 'transparent' : 'var(--bg-input)', borderBottomLeftRadius: '4px' }}>
                          {item.media_type === 'image' ? (
                            <a href={item.media_url} target="_blank" rel="noreferrer">
                              <img src={item.media_url} alt="foto" className="max-w-full max-h-60 object-cover rounded-2xl" />
                            </a>
                          ) : item.media_type === 'audio' ? (
                            <audio controls src={item.media_url} className="max-w-full" style={{minWidth:'200px'}} />
                          ) : (
                            <div className="px-3 py-2 text-sm leading-relaxed break-words"
                              style={isMine ? {color:'var(--bg-main)',fontWeight:500} : {color:'var(--text-primary)'}}>
                              {item.message}
                            </div>
                          )}
                        </div>
                        <span className="text-xs px-1 flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                          {formatTime(item.created_at)}
                          {isMine && (
                            <span style={{ color: item.read_at ? '#4ade80' : 'var(--text-muted)', fontSize: '10px', lineHeight: 1, fontWeight: 700 }}>
                              {item.read_at ? '✓✓' : '✓'}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );                })
              )}
              <div ref={bottomRef} />
            </div>
            {/* Input */}
            <div className="px-4 py-3 flex items-end gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Foto */}
              {/* Texto */}
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

              {/* Audio */}

              {/* Enviar texto */}
              <button onClick={handleSend} disabled={!input.trim() || uploading}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
                style={{ background: input.trim() ? 'var(--accent)' : 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <Send className="w-4 h-4" style={{ color: input.trim() ? 'var(--bg-main)' : 'var(--text-muted)' }} />
              </button>
              {uploading && <span className="text-xs" style={{color:'var(--text-muted)'}}>Enviando...</span>}
            </div>          </>
        )}
      </div>
    </div>
  );
}
