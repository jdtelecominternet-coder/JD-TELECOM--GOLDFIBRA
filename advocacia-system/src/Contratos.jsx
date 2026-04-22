import { useState, useRef, useEffect } from 'react';
import { getContracts, addContract, updateContract, getClients, getProcesses, getClientById } from './store';
import { StatusBadge } from './Dashboard';
import { Plus, FileText, X, PenTool, Camera, Check, ExternalLink } from 'lucide-react';

const DEFAULT_CONTENT = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

Pelo presente instrumento particular, de um lado o(a) CONTRATANTE identificado(a) acima, e de outro o ADVOGADO responsável pelo presente escritório, têm entre si justo e contratado o seguinte:

CLÁUSULA 1ª — DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios no processo indicado, incluindo todos os atos processuais necessários à defesa dos interesses do CONTRATANTE.

CLÁUSULA 2ª — DOS HONORÁRIOS
Os honorários advocatícios serão pagos conforme acordado entre as partes, cujo valor está especificado neste contrato.

CLÁUSULA 3ª — DO PRAZO
O presente contrato vigorará pelo prazo necessário à conclusão do processo objeto deste instrumento.

CLÁUSULA 4ª — DAS OBRIGAÇÕES DO ADVOGADO
O advogado obriga-se a defender os interesses do cliente com dedicação, ética e dentro dos limites legais.

CLÁUSULA 5ª — DAS OBRIGAÇÕES DO CLIENTE
O cliente obriga-se a fornecer todas as informações e documentos necessários ao bom andamento do processo.

E por estarem justos e contratados, as partes assinam o presente instrumento.`;

function SignatureModal({ onClose, onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [photoData, setPhotoData] = useState(null);
  const [tab, setTab] = useState('draw');
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const client = e.touches ? e.touches[0] : e;
    return { x: client.clientX - rect.left, y: client.clientY - rect.top };
  }

  function startDraw(e) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  }

  function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
  }

  function stopDraw() { setDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setCameraActive(true);
    } catch { alert('Câmera não disponível neste dispositivo/navegador.'); }
  }

  function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setPhotoData(canvas.toDataURL('image/jpeg', 0.8));
    videoRef.current.srcObject?.getTracks().forEach(t => t.stop());
    setCameraActive(false);
  }

  function handleSave() {
    const signatureData = tab === 'draw' && hasSignature ? canvasRef.current.toDataURL() : null;
    onSave({ signatureData, photoData });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px' }}>Assinatura Digital</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {[['draw', 'Assinar', PenTool], ['photo', 'Foto', Camera]].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${tab === id ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: tab === id ? 'rgba(201,168,76,0.12)' : 'transparent', color: tab === id ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        {tab === 'draw' && (
          <div>
            <p style={{ color: 'var(--white-dim)', fontSize: '12px', marginBottom: '10px' }}>Assine abaixo com o mouse ou dedo:</p>
            <canvas ref={canvasRef} className="signature-canvas" width={460} height={180} style={{ width: '100%', maxWidth: '460px' }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
            <button onClick={clearCanvas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)', fontSize: '12px', marginTop: '8px' }}>Limpar</button>
          </div>
        )}
        {tab === 'photo' && (
          <div>
            {!cameraActive && !photoData && (
              <button className="btn-outline" onClick={openCamera} style={{ padding: '12px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} /> Abrir Câmera
              </button>
            )}
            <video ref={videoRef} style={{ display: cameraActive ? 'block' : 'none', width: '100%', borderRadius: '8px', marginBottom: '8px' }} />
            {cameraActive && <button className="btn-gold" onClick={capturePhoto} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Capturar</button>}
            {photoData && <img src={photoData} style={{ width: '100%', borderRadius: '8px' }} alt="foto" />}
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn-outline" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
          <button className="btn-gold" onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={15} /> Confirmar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contratos({ user }) {
  const [contracts, setContracts] = useState(getContracts());
  const [clients] = useState(getClients());
  const [processes] = useState(getProcesses());
  const [modal, setModal] = useState(null);
  const [signModal, setSignModal] = useState(null);
  const [viewContract, setViewContract] = useState(null);
  const [form, setForm] = useState({});
  const [linkCopied, setLinkCopied] = useState(null);

  const reload = () => setContracts(getContracts());

  function openNew() {
    setForm({ content: DEFAULT_CONTENT, type: 'fixo', honorarios: '' });
    setModal('new');
  }

  function handleSave() {
    addContract(form);
    reload();
    setModal(null);
  }

  function handleSign(contractId, data) {
    updateContract(contractId, { status: 'assinado', signatureData: data.signatureData, photoData: data.photoData, signatureDate: new Date().toISOString() });
    reload();
    setSignModal(null);
  }

  function copyLink(c) {
    const link = `${window.location.origin}?contrato=${c.id}`;
    navigator.clipboard.writeText(link).then(() => { setLinkCopied(c.id); setTimeout(() => setLinkCopied(null), 2000); });
  }

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Contratos</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>{contracts.length} contratos cadastrados</p>
        </div>
        <button className="btn-gold" onClick={openNew} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Novo Contrato
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {contracts.map(c => (
          <div key={c.id} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ width: '40px', height: '40px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} color="var(--gold)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--white)', fontSize: '14px', fontWeight: '500', marginBottom: '2px' }}>{c.title}</div>
                <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{getClientName(c.clientId)} • {c.type === 'fixo' ? 'Valor Fixo' : 'Percentual'}: R$ {(c.honorarios || 0).toLocaleString('pt-BR')}</div>
              </div>
              <StatusBadge status={c.status} />
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => setViewContract(c)} className="btn-outline" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px' }}>Ver</button>
                {c.status !== 'assinado' && (
                  <button onClick={() => setSignModal(c.id)} className="btn-gold" style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PenTool size={12} /> Assinar
                  </button>
                )}
                <button onClick={() => copyLink(c)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(201,168,76,0.2)', background: 'transparent', color: linkCopied === c.id ? 'var(--green)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <ExternalLink size={12} /> {linkCopied === c.id ? 'Copiado!' : 'Link'}
                </button>
              </div>
            </div>
            {c.signatureData && (
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(201,168,76,0.08)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>Assinado em: {new Date(c.signatureDate).toLocaleDateString('pt-BR')}</span>
                <img src={c.signatureData} alt="assinatura" style={{ height: '40px', background: '#fff', borderRadius: '4px', padding: '2px' }} />
                {c.photoData && <img src={c.photoData} alt="foto" style={{ height: '40px', borderRadius: '4px' }} />}
              </div>
            )}
          </div>
        ))}
        {contracts.length === 0 && <div style={{ textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>Nenhum contrato cadastrado.</div>}
      </div>

      {/* View modal */}
      {viewContract && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px' }}>{viewContract.title}</h2>
              <button onClick={() => setViewContract(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ background: 'var(--black-4)', padding: '20px', borderRadius: '8px', whiteSpace: 'pre-wrap', fontSize: '13px', color: 'var(--white-dim)', lineHeight: '1.7', maxHeight: '400px', overflowY: 'scroll', fontFamily: 'Georgia, serif', display: 'block' }}>
              {viewContract.content}
            </div>
          </div>
        </div>
      )}

      {/* Sign modal */}
      {signModal && <SignatureModal onClose={() => setSignModal(null)} onSave={(data) => handleSign(signModal, data)} />}

      {/* New modal */}
      {modal === 'new' && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '700px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px' }}>Novo Contrato</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Título</label>
                <input className="input-dark" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Cliente</label>
                <select className="input-dark" value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Processo</label>
                <select className="input-dark" value={form.processId || ''} onChange={e => setForm({ ...form, processId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {processes.map(p => <option key={p.id} value={p.id}>{p.number}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Tipo</label>
                <select className="input-dark" value={form.type || 'fixo'} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="fixo">Valor Fixo</option>
                  <option value="percentual">Percentual</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Honorários (R$)</label>
                <input className="input-dark" type="number" value={form.honorarios || ''} onChange={e => setForm({ ...form, honorarios: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Conteúdo do Contrato</label>
                <textarea className="input-dark" rows={10} value={form.content || ''} onChange={e => setForm({ ...form, content: e.target.value })} style={{ resize: 'vertical', fontFamily: 'Georgia, serif', lineHeight: '1.7', maxWidth: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
              <button className="btn-gold" onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>Criar Contrato</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
