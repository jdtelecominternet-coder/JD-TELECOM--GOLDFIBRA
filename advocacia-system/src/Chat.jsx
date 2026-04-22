import { useState, useRef, useEffect } from 'react';
import { getProcesses, getClients, getMessages, addMessage, getClientById } from './store';
import { Send, MessageSquare } from 'lucide-react';

export default function Chat({ user }) {
  const processes = getProcesses();
  const clients = getClients();
  const [selectedProcess, setSelectedProcess] = useState(processes[0]?.id || null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState(selectedProcess ? getMessages(selectedProcess) : []);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedProcess) setMessages(getMessages(selectedProcess));
  }, [selectedProcess]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!text.trim() || !selectedProcess) return;
    const isClient = user.userType === 'client';
    addMessage({
      processId: selectedProcess,
      senderId: user.id,
      senderName: user.name,
      senderType: isClient ? 'client' : 'staff',
      text,
    });
    setMessages(getMessages(selectedProcess));
    setText('');
  }

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  const visibleProcesses = user.userType === 'client'
    ? processes.filter(p => p.clientId === user.id)
    : processes;

  return (
    <div className="animate-fadeIn" style={{ display: 'flex', height: 'calc(100vh - 108px)', gap: '0', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '280px', minWidth: '280px', background: 'var(--black-2)', borderRight: '1px solid rgba(201,168,76,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(201,168,76,0.1)' }}>
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em' }}>CONVERSAS</h3>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {visibleProcesses.map(p => {
            const msgs = getMessages(p.id);
            const last = msgs[msgs.length - 1];
            return (
              <div key={p.id} onClick={() => setSelectedProcess(p.id)} style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: selectedProcess === p.id ? 'rgba(201,168,76,0.08)' : 'transparent', borderLeft: `3px solid ${selectedProcess === p.id ? 'var(--gold)' : 'transparent'}` }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MessageSquare size={16} color="#0A0A0A" />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ color: 'var(--white)', fontSize: '13px', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getClientName(p.clientId)}</div>
                    <div style={{ color: 'var(--white-dim)', fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last?.text || 'Nenhuma mensagem'}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {visibleProcesses.length === 0 && <div style={{ padding: '20px', color: 'var(--white-dim)', fontSize: '12px' }}>Nenhum processo encontrado.</div>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--black)' }}>
        {selectedProcess ? (
          <>
            {/* Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(201,168,76,0.1)', background: 'var(--black-2)' }}>
              {(() => {
                const p = processes.find(x => x.id === selectedProcess);
                return p ? (
                  <div>
                    <div style={{ color: 'var(--white)', fontSize: '14px', fontWeight: '500' }}>{getClientName(p.clientId)}</div>
                    <div style={{ color: 'var(--gold)', fontSize: '11px', fontFamily: 'monospace' }}>{p.number}</div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Messages list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {messages.map(m => {
                const isOwn = m.senderId === user.id;
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ color: 'var(--white-dim)', fontSize: '10px', marginBottom: '3px' }}>{m.senderName} • {new Date(m.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className={isOwn ? 'chat-bubble-out' : 'chat-bubble-in'}>{m.text}</div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white-dim)', fontSize: '13px' }}>
                  Nenhuma mensagem ainda. Inicie a conversa!
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(201,168,76,0.1)', background: 'var(--black-2)', display: 'flex', gap: '10px' }}>
              <input className="input-dark" placeholder="Digite sua mensagem..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} style={{ flex: 1 }} />
              <button className="btn-gold" onClick={handleSend} style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                <Send size={15} /> Enviar
              </button>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white-dim)', fontSize: '13px' }}>
            Selecione uma conversa
          </div>
        )}
      </div>
    </div>
  );
}
