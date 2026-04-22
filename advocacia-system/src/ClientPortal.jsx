import { useState, useRef } from 'react';
import { getProcessesByClient, getContractsByProcess, getMessages, addMessage, getFiles, addFile, updateContract } from './store';
import {
  Scale, FolderOpen, FileText, MessageSquare, LogOut, Send,
  ArrowLeft, Clock, CheckCircle, AlertCircle, Upload, Download,
  PenTool, Camera, X, Check, File
} from 'lucide-react';
import { StatusBadge } from './Dashboard';

/* ── Assinatura Digital inline ── */
function SignaturePad({ onSave, onCancel }) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSign, setHasSign] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [tab, setTab] = useState('draw');
  const [camActive, setCamActive] = useState(false);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  function startDraw(e) { const ctx = canvasRef.current.getContext('2d'); const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); setDrawing(true); }
  function doDraw(e) { if (!drawing) return; e.preventDefault(); const ctx = canvasRef.current.getContext('2d'); ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSign(true); }
  function stopDraw() { setDrawing(false); }
  function clearCanvas() { canvasRef.current.getContext('2d').clearRect(0, 0, 460, 180); setHasSign(false); }

  async function openCam() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCamActive(true);
    } catch { alert('Câmera não disponível neste navegador/dispositivo.'); }
  }
  function capturePhoto() {
    const c = document.createElement('canvas');
    c.width = videoRef.current.videoWidth; c.height = videoRef.current.videoHeight;
    c.getContext('2d').drawImage(videoRef.current, 0, 0);
    setPhotoData(c.toDataURL('image/jpeg', 0.8));
    videoRef.current.srcObject?.getTracks().forEach(t => t.stop());
    setCamActive(false);
  }
  function handleSave() {
    const signatureData = tab === 'draw' && hasSign ? canvasRef.current.toDataURL() : null;
    onSave({ signatureData, photoData });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '0.08em' }}>Assinar Contrato</h2>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[['draw', 'Assinar', PenTool], ['photo', 'Foto', Camera]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${tab === id ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: tab === id ? 'rgba(201,168,76,0.12)' : 'transparent', color: tab === id ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {tab === 'draw' && (
          <div>
            <p style={{ color: 'var(--white-dim)', fontSize: '12px', marginBottom: '8px' }}>Assine abaixo com o mouse ou dedo:</p>
            <canvas ref={canvasRef} className="signature-canvas" width={460} height={180} style={{ width: '100%' }}
              onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={stopDraw} />
            <button onClick={clearCanvas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)', fontSize: '12px', marginTop: '6px' }}>Limpar</button>
          </div>
        )}
        {tab === 'photo' && (
          <div>
            {!camActive && !photoData && <button className="btn-outline" onClick={openCam} style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}><Camera size={15} /> Abrir Câmera</button>}
            <video ref={videoRef} style={{ display: camActive ? 'block' : 'none', width: '100%', borderRadius: '8px', marginBottom: '8px' }} />
            {camActive && <button className="btn-gold" onClick={capturePhoto} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Capturar Foto</button>}
            {photoData && <img src={photoData} style={{ width: '100%', borderRadius: '8px' }} alt="foto capturada" />}
            {photoData && <button onClick={() => setPhotoData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)', fontSize: '12px', marginTop: '6px' }}>Tirar outra foto</button>}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={onCancel} style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
          <button className="btn-gold" onClick={handleSave} disabled={tab === 'draw' && !hasSign && !photoData} style={{ padding: '10px 22px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', opacity: (tab === 'draw' && !hasSign && !photoData) ? 0.5 : 1 }}>
            <Check size={15} /> Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Detalhe do Processo com Abas ── */
function ProcessoDetalhe({ processo, user, onBack }) {
  const [tab, setTab] = useState('andamento');
  const [messages, setMessages] = useState(getMessages(processo.id));
  const [text, setText] = useState('');
  const [contracts, setContracts] = useState(getContractsByProcess(processo.id));
  const [files, setFiles] = useState(getFiles(processo.id));
  const [signModal, setSignModal] = useState(null);
  const fileInputRef = useRef(null);

  function reloadContracts() { setContracts(getContractsByProcess(processo.id)); }
  function reloadFiles() { setFiles(getFiles(processo.id)); }

  function handleSend() {
    if (!text.trim()) return;
    addMessage({ processId: processo.id, senderId: user.id, senderName: user.name, senderType: 'client', text });
    setMessages(getMessages(processo.id));
    setText('');
  }

  function handleSign(contractId, data) {
    updateContract(contractId, { status: 'assinado', signatureData: data.signatureData, photoData: data.photoData, signatureDate: new Date().toISOString() });
    reloadContracts();
    setSignModal(null);
  }

  function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      addFile({ name: file.name, size: file.size, type: file.type, data: ev.target.result, processId: processo.id, uploadedBy: user.name });
      reloadFiles();
    };
    reader.readAsDataURL(file);
  }

  function handleDownload(f) {
    const a = document.createElement('a'); a.href = f.data; a.download = f.name; a.click();
  }

  const TABS = [
    { id: 'andamento', label: 'Andamento', icon: Clock },
    { id: 'chat', label: 'Mensagens', icon: MessageSquare },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'arquivos', label: 'Arquivos', icon: FolderOpen },
  ];

  return (
    <div className="animate-fadeIn">
      {/* Process header */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '14px', padding: 0 }}>
          <ArrowLeft size={16} /> Voltar para meus processos
        </button>
        <div style={{ background: 'var(--black-3)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)', marginBottom: '4px', letterSpacing: '0.02em' }}>{processo.number}</div>
              <h2 style={{ color: 'var(--white)', fontSize: '18px', fontWeight: '600' }}>{processo.type}</h2>
            </div>
            <StatusBadge status={processo.status} />
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '12px' }}>
            {[['Vara', processo.vara], ['Juiz(a)', processo.judge]].filter(([, v]) => v).map(([k, v]) => (
              <span key={k}><span style={{ color: 'var(--gold)' }}>{k}:</span> <span style={{ color: 'var(--white-dim)' }}>{v}</span></span>
            ))}
          </div>
          {processo.description && <p style={{ color: 'var(--white-dim)', fontSize: '13px', marginTop: '10px', lineHeight: '1.5' }}>{processo.description}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(201,168,76,0.1)', marginBottom: '20px', overflowX: 'auto' }}>
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer', color: tab === t.id ? 'var(--gold)' : 'var(--white-dim)', borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', whiteSpace: 'nowrap', fontFamily: 'Inter, sans-serif', transition: 'color 0.15s' }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── ABA: ANDAMENTO ── */}
      {tab === 'andamento' && (
        <div className="animate-fadeIn">
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '20px' }}>HISTÓRICO DE MOVIMENTAÇÕES</h3>
          {(!processo.movements || processo.movements.length === 0) ? (
            <p style={{ color: 'var(--white-dim)', fontSize: '14px' }}>Nenhuma movimentação registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
              {[...processo.movements].reverse().map((m, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '16px', paddingBottom: '24px', position: 'relative' }}>
                  {i < arr.length - 1 && <div style={{ position: 'absolute', left: '8px', top: '20px', bottom: 0, width: '2px', background: 'linear-gradient(to bottom, rgba(201,168,76,0.4), rgba(201,168,76,0.05))' }} />}
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--black-4)', border: `2px solid ${i === 0 ? 'var(--gold)' : 'rgba(201,168,76,0.3)'}`, flexShrink: 0, zIndex: 1, marginTop: '2px' }} />
                  <div className="card" style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ color: 'var(--white)', fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>{m.text}</div>
                    <div style={{ color: 'var(--white-dim)', fontSize: '11px', display: 'flex', gap: '10px' }}>
                      <span>{new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{m.author}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA: CHAT ── */}
      {tab === 'chat' && (
        <div className="animate-fadeIn">
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '16px' }}>FALAR COM O ESCRITÓRIO</h3>
          <div style={{ background: 'var(--black-2)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', display: 'flex', flexDirection: 'column', height: '420px' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--white-dim)', gap: '10px' }}>
                  <MessageSquare size={32} style={{ opacity: 0.3 }} />
                  <p style={{ fontSize: '13px' }}>Envie uma mensagem ao escritório.</p>
                </div>
              )}
              {messages.map(m => {
                const isOwn = m.senderId === user.id;
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ color: 'var(--white-dim)', fontSize: '10px', marginBottom: '3px' }}>{m.senderName} • {new Date(m.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className={isOwn ? 'chat-bubble-out' : 'chat-bubble-in'}>{m.text}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px', borderTop: '1px solid rgba(201,168,76,0.08)', display: 'flex', gap: '8px' }}>
              <input className="input-dark" placeholder="Digite sua mensagem..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} style={{ flex: 1 }} />
              <button className="btn-gold" onClick={handleSend} style={{ padding: '10px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <Send size={14} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ABA: DOCUMENTOS / CONTRATOS ── */}
      {tab === 'documentos' && (
        <div className="animate-fadeIn">
          <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em', marginBottom: '16px' }}>CONTRATOS E DOCUMENTOS</h3>
          {contracts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--white-dim)' }}>
              <FileText size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>Nenhum contrato vinculado a este processo.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {contracts.map(c => (
                <div key={c.id} className="card" style={{ padding: '22px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <div style={{ color: 'var(--white)', fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>{c.title}</div>
                      <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>
                        Honorários: <span style={{ color: 'var(--gold)' }}>R$ {(c.honorarios || 0).toLocaleString('pt-BR')}</span>
                        {' · '}{c.type === 'fixo' ? 'Valor Fixo' : 'Percentual'}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  {c.content && (
                    <div style={{ background: 'var(--black-4)', padding: '16px', borderRadius: '8px', fontSize: '12px', color: 'var(--white-dim)', maxHeight: '150px', overflowY: 'scroll', fontFamily: 'Georgia, serif', lineHeight: '1.7', marginBottom: '14px', whiteSpace: 'pre-wrap', display: 'block' }}>
                      {c.content}
                    </div>
                  )}

                  {c.status === 'assinado' ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', background: 'rgba(39,174,96,0.08)', border: '1px solid rgba(39,174,96,0.2)', borderRadius: '8px' }}>
                      <CheckCircle size={16} color="#27AE60" />
                      <span style={{ color: '#27AE60', fontSize: '13px' }}>Assinado em {new Date(c.signatureDate).toLocaleDateString('pt-BR')}</span>
                      {c.signatureData && <img src={c.signatureData} alt="assinatura" style={{ height: '36px', background: '#fff', borderRadius: '4px', padding: '2px' }} />}
                      {c.photoData && <img src={c.photoData} alt="foto" style={{ height: '36px', borderRadius: '4px' }} />}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', background: 'rgba(230,126,34,0.08)', border: '1px solid rgba(230,126,34,0.2)', borderRadius: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={15} color="#E67E22" />
                        <span style={{ color: '#E67E22', fontSize: '13px' }}>Aguardando sua assinatura</span>
                      </div>
                      <button className="btn-gold" onClick={() => setSignModal(c.id)} style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PenTool size={13} /> Assinar Agora
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {signModal && <SignaturePad onCancel={() => setSignModal(null)} onSave={(data) => handleSign(signModal, data)} />}
        </div>
      )}

      {/* ── ABA: ARQUIVOS ── */}
      {tab === 'arquivos' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em' }}>ARQUIVOS DO PROCESSO</h3>
            <button className="btn-outline" onClick={() => fileInputRef.current?.click()} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={13} /> Enviar Arquivo
            </button>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
          </div>

          {files.length === 0 ? (
            <div onClick={() => fileInputRef.current?.click()} style={{ border: '2px dashed rgba(201,168,76,0.2)', borderRadius: '10px', padding: '48px', textAlign: 'center', cursor: 'pointer' }}>
              <Upload size={28} color="var(--gold-dark)" style={{ margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>Nenhum arquivo ainda. Clique para enviar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {files.map(f => (
                <div key={f.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '36px', height: '36px', background: 'rgba(201,168,76,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <File size={16} color="var(--gold)" />
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ color: 'var(--white)', fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>{f.size > 1048576 ? `${(f.size/1048576).toFixed(1)} MB` : `${(f.size/1024).toFixed(0)} KB`} · {f.uploadedBy}</div>
                  </div>
                  <button onClick={() => handleDownload(f)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Download size={12} /> Baixar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Portal Principal ── */
export default function ClientPortal({ user, onLogout }) {
  const [processes] = useState(getProcessesByClient(user.id));
  const [selectedProcess, setSelectedProcess] = useState(null);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--black)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ background: 'var(--black-2)', borderBottom: '1px solid rgba(201,168,76,0.15)', padding: '0 20px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={16} color="#0A0A0A" />
          </div>
          <div>
            <span className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '13px', letterSpacing: '0.1em' }}>PORTAL DO CLIENTE</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'var(--white)', fontSize: '12px', fontWeight: '500' }}>{user.name}</div>
            <div style={{ color: 'var(--gold)', fontSize: '10px', letterSpacing: '0.05em' }}>@{user.username}</div>
          </div>
          <button onClick={onLogout} title="Sair" style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', borderRadius: '6px', padding: '7px', cursor: 'pointer', color: '#E74C3C', display: 'flex', alignItems: 'center' }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, padding: '24px 20px', maxWidth: '900px', width: '100%', margin: '0 auto' }}>

        {/* ── DETALHE DO PROCESSO ── */}
        {selectedProcess ? (
          <ProcessoDetalhe processo={selectedProcess} user={user} onBack={() => setSelectedProcess(null)} />
        ) : (
          /* ── LISTA DE PROCESSOS ── */
          <div className="animate-fadeIn">
            <div style={{ marginBottom: '24px' }}>
              <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)', marginBottom: '4px' }}>Meus Processos</h1>
              <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>{processes.length} processo(s) vinculado(s) à sua conta</p>
            </div>

            {processes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                <FolderOpen size={52} style={{ margin: '0 auto 16px', color: 'var(--gold-dark)', opacity: 0.4 }} />
                <p style={{ color: 'var(--white)', fontSize: '16px', marginBottom: '8px' }}>Nenhum processo encontrado</p>
                <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>Entre em contato com o escritório.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {processes.map(p => {
                  const msgCount = getMessages(p.id).length;
                  const contractCount = getContractsByProcess(p.id).length;
                  const pendente = getContractsByProcess(p.id).find(c => c.status !== 'assinado');
                  return (
                    <div key={p.id} className="card" style={{ padding: '22px', cursor: 'pointer' }} onClick={() => setSelectedProcess(p)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)', marginBottom: '5px' }}>{p.number}</div>
                          <h3 style={{ color: 'var(--white)', fontSize: '16px', fontWeight: '600' }}>{p.type}</h3>
                        </div>
                        <StatusBadge status={p.status} />
                      </div>

                      {p.description && <p style={{ color: 'var(--white-dim)', fontSize: '13px', lineHeight: '1.5', marginBottom: '14px' }}>{p.description}</p>}

                      {/* Badges de resumo */}
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={11} /> {p.movements?.length || 0} movimentações
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MessageSquare size={11} /> {msgCount} mensagens
                        </span>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FileText size={11} /> {contractCount} documento(s)
                        </span>
                        {pendente && (
                          <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(230,126,34,0.12)', border: '1px solid rgba(230,126,34,0.3)', color: '#E67E22', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <AlertCircle size={11} /> Contrato aguardando assinatura
                          </span>
                        )}
                      </div>

                      <div style={{ color: 'var(--gold)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Abrir processo →
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
