import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, XCircle, Truck, Wrench, Upload, ChevronDown, ChevronUp, MapPin, Copy, Check, Navigation, Wifi, Signal, MessageCircle, Eye, EyeOff, DollarSign, Banknote, Clock, Trash2, PenLine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { saveOfflineAction } from '../services/offlineQueue';
import AdminDeleteModal from '../components/AdminDeleteModal';
import OSTimer from '../components/OSTimer';
import CancelOSModal from '../components/CancelOSModal';
import CTOModal from '../components/CTOModal';
import MaintenanceModal from '../components/MaintenanceModal';

function SignaturePad({ onSave, onClear, hasSig }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  }

  function start(e) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e293b';
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stop(e) {
    e.preventDefault();
    drawing.current = false;
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL('image/png'));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }

  return (
    <div>
      <div style={{ border: '2px dashed #f59e0b', borderRadius: 10, background: '#fffbeb', position: 'relative' }}>
        <canvas ref={canvasRef} width={340} height={120} style={{ width: '100%', height: 120, touchAction: 'none', display: 'block', borderRadius: 8 }}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop} />
        {!hasSig && <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#92400e', fontSize: 13, pointerEvents: 'none', whiteSpace: 'nowrap' }}>✍️ Assine aqui</p>}
      </div>
      <button onClick={clear} style={{ marginTop: 6, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Limpar assinatura</button>
    </div>
  );
}

function CopyId({ id }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); });
  }
  return (
    <button onClick={copy} title="Copiar ID"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold font-mono"
      style={{ background: copied ? '#22c55e22' : 'var(--bg-input)', color: copied ? '#22c55e' : 'var(--accent)', border: '1px solid var(--border)' }}>
      {id}
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

const STATUS_LABEL = { pendente:'Pendente', em_deslocamento:'Em Deslocamento', em_execucao:'Em Execução', finalizado:'Finalizado', cancelado:'Cancelado' };
function StatusBadge({ s }) { return <span className={`badge-${s}`}>{STATUS_LABEL[s]||s}</span>; }

const PHOTO_FIELDS = [
  { key: 'photo_cto_open',    label: 'CTO Aberta',              required: true },
  { key: 'photo_cto_closed',  label: 'CTO Fechada',             required: true },
  { key: 'photo_signal_cto',  label: 'Medição de Sinal (CTO)',  required: true },
  { key: 'photo_meter',       label: 'Medidor na Casa do Cliente', required: true },
  { key: 'photo_mac',         label: 'MAC do Modem',            required: true },
  { key: 'photo_onu',         label: 'Local da ONU',            required: true },
  { key: 'photo_speedtest',   label: 'Teste de Velocidade',     required: true },
];

export default function TechnicalOrders() {
  const { user } = useAuth();
  const [cancelModal, setCancelModal] = useState(null);
  const [ctoModal, setCtoModal] = useState(null);
  const [maintenanceModal, setMaintenanceModal] = useState(null);
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [techForm, setTechForm] = useState({});
  const [photos, setPhotos] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRefs = useRef({});
  const [showPppoePass, setShowPppoePass] = useState(false);
  const [showWifiPass, setShowWifiPass] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [deletePhotoModal, setDeletePhotoModal] = useState(null);
  const [signatures, setSignatures] = useState({}); // { [osId]: base64 }

  async function finalizeWithSignature(osId) {
    if (!signatures[osId]) {
      toast.error('Assinatura do cliente obrigatória!');
      return;
    }
    try {
      await api.put(`/orders/${osId}/technical`, { client_signature: signatures[osId] });
      await updateStatus(osId, 'finalizado');
    } catch { toast.error('Erro ao finalizar'); }
  } // { orderId, field }

  async function deletePhoto(orderId, field) {
    setDeletePhotoModal({ orderId, field });
  }

  async function doDeletePhoto() {
    await api.delete(`/orders/${deletePhotoModal.orderId}/photo/${deletePhotoModal.field}`);
    toast.success('Foto removida!');
    load();
  }

  async function load() {
    try { const r = await api.get('/orders'); setOrders(r.data); }
    catch {} finally { setLoading(false); }
  }
  useEffect(() => {
    load();
    api.get('/settings/my-earnings').then(r => setEarnings(r.data)).catch(() => {});
  }, []);

  // Atualização em tempo real via socket
  const chatCtx = useChat();
  useEffect(() => {
    const socket = chatCtx?.socket;
    if (!socket) return;
    const onRefresh = (data) => {
      if (!data?.entity || data.entity === 'orders') load();
    };
    const onNova = () => load();
    const onRemovida = () => load();
    socket.on('data:refresh', onRefresh);
    socket.on('os:nova', onNova);
    socket.on('os:removida', onRemovida);
    return () => {
      socket.off('data:refresh', onRefresh);
      socket.off('os:nova', onNova);
      socket.off('os:removida', onRemovida);
    };
  }, [chatCtx?.socket]);

  async function captureGeo(id) {
    if (!navigator.geolocation) return toast.error('Geolocalização não suportada');
    toast.loading('Capturando localização...', { id: 'geo' });
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      let geo_address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
        const data = await res.json();
        if (data.display_name) geo_address = data.display_name;
      } catch {}
      try {
        await api.put(`/orders/${id}/geo`, { latitude, longitude, geo_address });
        toast.success('Localização salva!', { id: 'geo' });
        load();
      } catch { toast.error('Erro ao salvar localização', { id: 'geo' }); }
    }, () => { toast.error('Permissão de localização negada', { id: 'geo' }); });
  }

  function toggleExpand(id) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const os = orders.find(o => o.id === id);
    setTechForm({
      drop_start: os.drop_start || '',
      drop_end: os.drop_end || '',
      fiber_spool_total: os.fiber_spool_total ?? '',
      mat_esticador: os.mat_esticador ?? 0,
      mat_conector: os.mat_conector ?? 0,
      mat_bucha: os.mat_bucha ?? 0,
      mat_fixa_cabo: os.mat_fixa_cabo ?? 0,
      tech_observations: os.tech_observations || '',
      pppoe_user: os.pppoe_user || '',
      pppoe_pass: os.pppoe_pass || '',
      cto_number: os.cto_number || '',
      cto_port: os.cto_port || '',
      signal_cto: os.signal_cto ?? '',
      signal_client: os.signal_client ?? '',
      wifi_name: os.wifi_name || os.wifi_ssid || '',
      wifi_pass: os.wifi_pass || '',
      mac_equipment: os.mac_equipment || '',
      fiber_lot: os.fiber_lot || ''
    });
    setPhotos({});
  }

  async function handleCancel(os, { motivo, descricao, fotos }) {
    try {
      await api.put(`/orders/${os.id}/status`, {
        status: 'cancelado',
        observations: `[CANCELAMENTO] Motivo: ${motivo}${descricao ? ' — ' + descricao : ''}`
      });
      if (fotos.length > 0) {
        const fd = new FormData();
        fotos.forEach((f, i) => fd.append(`cancel_photo_${i}`, f));
        fd.append('cancel_motivo', motivo);
        fd.append('cancel_descricao', descricao || '');
        await api.post(`/orders/${os.id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).catch(() => {});
      }
      toast.success('OS cancelada com sucesso!');
      setCancelModal(null);
      load();
    } catch { toast.error('Erro ao cancelar OS'); }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/orders/${id}/status`, { status });
      toast.success(`Status: ${STATUS_LABEL[status]}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao atualizar status');
    }
  }

  async function saveTech(id) {
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await saveOfflineAction({ method: 'put', url: `/orders/${id}/technical`, data: techForm, description: 'Dados Técnicos OS #' + id });
        toast.success('💾 Salvo offline! Será enviado ao conectar.');
      } else {
        await api.put(`/orders/${id}/technical`, techForm);
        toast.success('Dados técnicos salvos!');
        load();
      }
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function saveCTO(id) {
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await saveOfflineAction({ method: 'put', url: `/orders/${id}/technical`, data: techForm, description: 'Dados CTO OS #' + id });
        toast.success('💾 Dados CTO salvos offline! Será enviado ao conectar.');
      } else {
        await api.put(`/orders/${id}/technical`, techForm);
        const ctoKeys = ['photo_cto_open','photo_cto_closed','photo_signal_cto'];
        const hasCtoPhotos = ctoKeys.some(k => photos[k]);
        if (hasCtoPhotos) {
          const fd = new FormData();
          ctoKeys.forEach(k => { if (photos[k]) fd.append(k, photos[k]); });
          await api.post(`/orders/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          setPhotos(p => { const n={...p}; ctoKeys.forEach(k=>delete n[k]); return n; });
        }
        toast.success('CTO salvo com sucesso!');
        load();
      }
    } catch { toast.error('Erro ao salvar CTO'); }
    finally { setSaving(false); }
  }

  async function saveCliente(id) {
    setSaving(true);
    try {
      if (!navigator.onLine) {
        await saveOfflineAction({ method: 'put', url: `/orders/${id}/technical`, data: techForm, description: 'Dados Cliente OS #' + id });
        toast.success('💾 Dados do cliente salvos offline! Será enviado ao conectar.');
      } else {
        await api.put(`/orders/${id}/technical`, techForm);
        const clientKeys = ['photo_meter','photo_mac','photo_onu','photo_speedtest'];
        const hasClientPhotos = clientKeys.some(k => photos[k]);
        if (hasClientPhotos) {
          const fd = new FormData();
          clientKeys.forEach(k => { if (photos[k]) fd.append(k, photos[k]); });
          await api.post(`/orders/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          setPhotos(p => { const n={...p}; clientKeys.forEach(k=>delete n[k]); return n; });
        }
        toast.success('Dados do cliente salvos!');
        load();
      }
    } catch { toast.error('Erro ao salvar dados do cliente'); }
    finally { setSaving(false); }
  }

  async function uploadPhotos(id) {
    const hasAny = Object.values(photos).some(Boolean);
    if (!hasAny) return toast.error('Selecione pelo menos uma foto');
    setUploading(true);
    const fd = new FormData();
    PHOTO_FIELDS.forEach(({ key }) => { if (photos[key]) fd.append(key, photos[key]); });
    try {
      await api.post(`/orders/${id}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Fotos enviadas!');
      setPhotos({});
      load();
    } catch { toast.error('Erro ao enviar fotos'); }
    finally { setUploading(false); }
  }

  const dropTotal = () => {
    const s = parseFloat(techForm.drop_start);
    const e = parseFloat(techForm.drop_end);
    return !isNaN(s) && !isNaN(e) ? Math.abs(e - s).toFixed(1) : null;
  };

  function signalColor(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return 'var(--text-muted)';
    if (n > -17) return '#ef4444';
    if (n >= -25) return '#22c55e';
    return '#ef4444';
  }
  function signalLabel(v) {
    const n = parseFloat(v);
    if (isNaN(n)) return '';
    if (n > -17) return 'FORTE';
    if (n >= -25) return 'BOM';
    return 'FRACO';
  }

  function buildWhatsAppMsg(os) {
    const lines = [];
    lines.push('*RELATÓRIO DE INSTALAÇÃO - JD TELECOM - GOLD FIBRA*');
    lines.push('');
    lines.push('*Cliente:* ' + (os.client_name || ''));
    lines.push('*OS:* ' + (os.readable_id || os.os_number || ('JD-' + String(os.id).padStart(4,'0'))));
    lines.push('*Técnico:* ' + (os.technician_name || ''));
    if (os.scheduled_date) lines.push('*Data:* ' + new Date(os.scheduled_date).toLocaleDateString('pt-BR'));
    lines.push('*Endereço:* ' + [os.client_street, os.client_number, os.client_neighborhood, os.client_city, os.client_state].filter(Boolean).join(', '));
    lines.push('');
    if (os.pppoe_user || os.pppoe_pass) {
      lines.push('*ACESSO PPPoE*');
      if (os.pppoe_user) lines.push('Usuário: ' + os.pppoe_user);
      if (os.pppoe_pass) lines.push('Senha: ' + os.pppoe_pass);
      lines.push('');
    }
    if (os.cto_number || os.cto_port || os.signal_cto || os.signal_client) {
      lines.push('*CTO / FIBRA*');
      if (os.cto_number) lines.push('CTO: ' + os.cto_number + (os.cto_port ? ' | Porta: ' + os.cto_port : ''));
      if (os.signal_cto) lines.push('Sinal CTO: ' + os.signal_cto + ' dBm');
      if (os.signal_client) lines.push('Sinal Cliente: ' + os.signal_client + ' dBm');
      lines.push('');
    }
    if (os.wifi_name || os.wifi_pass) {
      lines.push('*WI-FI*');
      if (os.wifi_name) lines.push('Nome: ' + os.wifi_name);
      if (os.wifi_pass) lines.push('Senha: ' + os.wifi_pass);
      lines.push('');
    }
    if (os.equipment_mac || os.fiber_lot) {
      lines.push('*EQUIPAMENTO*');
      if (os.equipment_mac) lines.push('MAC: ' + os.equipment_mac);
      if (os.fiber_lot) lines.push('Lote Fibra: ' + os.fiber_lot);
      lines.push('');
    }
    if (os.tech_observations) {
      lines.push('*OBSERVAÇÕES*');
      lines.push(os.tech_observations);
      lines.push('');
    }
    lines.push('📋 *Ver relatório completo com fotos:*');
    lines.push('https://jdtelecom.online/relatorio/' + os.id);
    return lines.join('\n');
  }

  function sendWhatsApp(os) {
    const phone = (os.client_whatsapp || '').replace(/\D/g, '');
    if (!phone) { toast.error('Cliente sem WhatsApp cadastrado'); return; }
    const full = phone.length <= 11 ? '55' + phone : phone;
    const msg = buildWhatsAppMsg(os);
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  const active = orders.filter(o => !['finalizado','cancelado'].includes(o.status));
  const done   = orders.filter(o => ['finalizado','cancelado'].includes(o.status));

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Módulo Técnico</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{orders.length} ordens de serviço</p>
      </div>

      {/* Active OS */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Ordens Ativas ({active.length})</h2>
        <div className="space-y-3">
          {active.length === 0 && <div className="card text-center py-8" style={{ color: 'var(--text-muted)' }}>Nenhuma OS ativa</div>}
          {active.map(os => {
            const photoDone = PHOTO_FIELDS.filter(f => os[f.key]).length;
            const photoTotal = PHOTO_FIELDS.length;
            const allPhotosDone = photoDone === photoTotal;

            return (
              <div key={os.id} className="card">
                {/* Header row */}
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    {os.tipo_ordem_servico && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl mb-2 font-bold text-sm"
                        style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#818cf8' }}>
                        🔧 {os.tipo_ordem_servico}
                        {os.valor_servico != null && (
                          <span className="ml-2 px-2 py-0.5 rounded-lg text-xs font-black" style={{ background: '#10b98122', color: '#10b981' }}>
                            R$ {Number(os.valor_servico).toFixed(2).replace('.',',')}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="font-mono font-bold text-sm" style={{ color: 'var(--accent)' }}>{os.os_number}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <CopyId id={os.readable_id || os.os_number} />
                    {os.gold_fibra_id && (
                      <div className="mt-1.5 p-2 rounded-lg inline-flex items-center gap-2" style={{background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)"}}>
                        <span className="text-xs font-semibold" style={{color:"var(--accent)"}}>ID Gold Fibra:</span>
                        <span className="font-mono font-bold text-sm" style={{color:"var(--text-primary)"}}>{os.gold_fibra_id}</span>
                      </div>
                    )}
                    </div>
                    <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{os.client_name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {os.client_street}, {os.client_number} — {os.client_neighborhood}, {os.client_city}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Plano: <strong style={{ color: 'var(--text-primary)' }}>{os.plan_name}</strong> — {os.plan_speed}</p>
                    {/* Cronômetro sempre visível quando em execução */}
                    {os.status === 'em_execucao' && <OSTimer startedAt={os.started_at} />}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge s={os.status} />
                    {/* Photo progress */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${allPhotosDone ? 'bg-green-500/15 text-green-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
                      {photoDone}/{photoTotal} fotos
                    </span>
                    {(os.client_street || os.client_city) && (
                      <button
                        onClick={() => {
                          const addr = [os.client_street, os.client_number, os.client_neighborhood, os.client_city, os.client_state].filter(Boolean).join(', ');
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`, '_blank');
                        }}
                        className="py-1.5 text-sm flex items-center gap-1.5 px-3 rounded-xl font-bold"
                        style={{ background: '#1a73e8', color: '#fff' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Abrir Rota
                      </button>
                    )}
                    {os.status === 'pendente' && (
                      <button onClick={() => updateStatus(os.id, 'em_deslocamento')} className="btn-primary py-1.5 text-sm">
                        <Truck className="w-4 h-4" /> Iniciar Rota
                      </button>
                    )}
                    {os.status === 'em_deslocamento' && (
                      <button onClick={() => updateStatus(os.id, 'em_execucao')} className="btn-primary py-1.5 text-sm">
                        <Wrench className="w-4 h-4" /> Iniciar Serviço
                      </button>
                    )}
                    <button onClick={() => toggleExpand(os.id)} className="btn-secondary py-1.5 text-sm">
                      {expanded === os.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Detalhes
                    </button>
                  </div>
                </div>

                {expanded === os.id && (
                  <div className="mt-5 pt-5 space-y-6" style={{ borderTop: '1px solid var(--border)' }}>

                    {/* ── GEOLOCALIZAÇÃO ── */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <MapPin className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Localização do Serviço
                      </h3>
                      {os.geo_address ? (
                        <div className="rounded-xl p-3 flex items-center justify-between flex-wrap gap-3"
                          style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Endereço capturado</p>
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{os.geo_address}</p>
                          </div>
                          <div className="flex gap-2">
                            <a href={`https://www.google.com/maps?q=${os.latitude},${os.longitude}`}
                              target="_blank" rel="noreferrer" className="btn-primary text-xs py-1.5 px-3">
                              <MapPin className="w-3 h-3" /> Abrir no Mapa
                            </a>
                            <button onClick={() => captureGeo(os.id)} className="btn-secondary text-xs py-1.5 px-3">
                              <Navigation className="w-3 h-3" /> Atualizar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => captureGeo(os.id)} className="btn-primary text-sm">
                          <Navigation className="w-4 h-4" /> Capturar Localização Atual
                        </button>
                      )}
                    </div>

                    {/* ── SEÇÃO CTO ── */}
                    <div className="rounded-2xl p-4 space-y-4" style={{background:'var(--bg-input)',border:'2px solid var(--border)'}}>
                      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Fotos e Dados da CTO
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        {[{key:'photo_cto_open',label:'CTO Aberta'},{key:'photo_cto_closed',label:'CTO Fechada'},{key:'photo_signal_cto',label:'Sinal CTO'}].map(({key,label}) => (
                          <div key={key} className="rounded-xl p-2" style={{background:'var(--bg-main)',border:'1px solid var(--border)'}}>
                            <p className="text-xs font-semibold mb-2 text-center" style={{color:'var(--text-secondary)'}}>{label}</p>
                            {os[key] ? (
                              <div className="relative">
                                <a href={os[key]} target="_blank" rel="noreferrer">
                                  <img src={os[key]} alt={label} className="w-full h-20 object-cover rounded-lg" />
                                </a>
                                <span className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><CheckCircle className="w-3 h-3 text-white" /></span>
                                <button onClick={() => deletePhoto(os.id, key)} className="absolute top-1 left-1 bg-red-500 rounded-full p-0.5 hover:bg-red-600" title="Remover foto">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-20 rounded-lg cursor-pointer" style={{border:`2px dashed ${photos[key]?'var(--accent)':'var(--border)'}`}}>
                                <Upload className="w-4 h-4 mb-1" style={{color:'var(--text-muted)'}} />
                                <span className="text-xs text-center" style={{color:'var(--text-muted)'}}>{photos[key]?'OK':'Adicionar'}</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setPhotos(p=>({...p,[key]:e.target.files[0]}))} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="label">Numero da CTO</label>
                          <input value={techForm.cto_number} onChange={e => setTechForm(p => ({ ...p, cto_number: e.target.value.replace(/[^0-9]/g, '') }))} className="input" placeholder="Ex: 05" />
                        </div>
                        <div>
                          <label className="label">Porta Utilizada</label>
                          <input value={techForm.cto_port} onChange={e => setTechForm(p => ({ ...p, cto_port: e.target.value.replace(/[^0-9]/g, '') }))} className="input" placeholder="Ex: 08" />
                        </div>
                        <div>
                          <label className="label flex items-center gap-1"><Signal className="w-3 h-3" /> Sinal CTO (dBm)</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 font-bold text-base select-none z-10" style={{color:'var(--text-primary)'}}>-</span>
                            <input type="number" step="0.1" min="0" max="50"
                              value={techForm.signal_cto !== "" ? String(techForm.signal_cto).replace("-","") : ""}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^0-9.]/g, '');
                                const val = raw === '' ? '' : -Math.abs(parseFloat(raw));
                                setTechForm(p => ({ ...p, signal_cto: isNaN(val) ? '' : val }));
                              }}
                              className="input pl-6 pr-16" placeholder="21.0" />
                            {techForm.signal_cto !== "" && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{color:signalColor(techForm.signal_cto)}}>{signalLabel(techForm.signal_cto)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button onClick={()=>saveCTO(os.id)} disabled={saving||uploading} className="btn-primary text-sm w-full">
                        {saving||uploading?'Salvando...':'Salvar CTO'}
                      </button>
                    </div>

                    {/* ── SEÇÃO CLIENTE ── */}
                    <div className="rounded-2xl p-4 space-y-4" style={{background:'var(--bg-input)',border:'2px solid #22c55e44'}}>
                      <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Camera className="w-4 h-4" style={{ color: '#22c55e' }} /> Fotos e Dados do Cliente
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[{key:'photo_meter',label:'Medidor'},{key:'photo_mac',label:'MAC Modem'},{key:'photo_onu',label:'Local ONU'},{key:'photo_speedtest',label:'Speedtest'}].map(({key,label}) => (
                          <div key={key} className="rounded-xl p-2" style={{background:'var(--bg-main)',border:'1px solid var(--border)'}}>
                            <p className="text-xs font-semibold mb-2 text-center" style={{color:'var(--text-secondary)'}}>{label}</p>
                            {os[key] ? (
                              <div className="relative">
                                <a href={os[key]} target="_blank" rel="noreferrer">
                                  <img src={os[key]} alt={label} className="w-full h-20 object-cover rounded-lg" />
                                </a>
                                <span className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><CheckCircle className="w-3 h-3 text-white" /></span>
                                <button onClick={() => deletePhoto(os.id, key)} className="absolute top-1 left-1 bg-red-500 rounded-full p-0.5 hover:bg-red-600" title="Remover foto">
                                  <Trash2 className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-20 rounded-lg cursor-pointer" style={{border:`2px dashed ${photos[key]?'#22c55e':'var(--border)'}`}}>
                                <Upload className="w-4 h-4 mb-1" style={{color:'var(--text-muted)'}} />
                                <span className="text-xs text-center" style={{color:'var(--text-muted)'}}>{photos[key]?'OK':'Adicionar'}</span>
                                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setPhotos(p=>({...p,[key]:e.target.files[0]}))} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="label flex items-center gap-1"><Signal className="w-3 h-3" /> Sinal Cliente (dBm)</label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 font-bold text-base select-none z-10" style={{color:'var(--text-primary)'}}>-</span>
                            <input type="number" step="0.1" min="0" max="50"
                              value={techForm.signal_client !== "" ? String(techForm.signal_client).replace("-","") : ""}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^0-9.]/g, '');
                                const val = raw === '' ? '' : -Math.abs(parseFloat(raw));
                                setTechForm(p => ({ ...p, signal_client: isNaN(val) ? '' : val }));
                              }}
                              className="input pl-6 pr-16" placeholder="21.0" />
                            {techForm.signal_client !== "" && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold" style={{color:signalColor(techForm.signal_client)}}>{signalLabel(techForm.signal_client)}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="label">MAC do Equipamento</label>
                          <input value={techForm.mac_equipment} onChange={e => { const raw = e.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12); const mac = raw.match(/.{1,2}/g)?.join(':') || raw; setTechForm(p => ({...p, mac_equipment: mac})); }} className="input font-mono tracking-widest" placeholder="AA:BB:CC:DD:EE:FF" maxLength={17} />
                        </div>
                        <div>
                          <label className="label">Usuario PPPoE</label>
                          <input value={techForm.pppoe_user} onChange={e=>setTechForm(p=>({...p,pppoe_user:e.target.value}))} className="input" placeholder="usuario@provedor" />
                        </div>
                        <div>
                          <label className="label">Senha PPPoE</label>
                          <div className="relative">
                            <input type="text" value={techForm.pppoe_pass} onChange={e=>setTechForm(p=>({...p,pppoe_pass:e.target.value}))} className="input pr-10" placeholder="senha pppoe" />



                          </div>
                        </div>
                        <div>
                          <label className="label flex items-center gap-1"><Wifi className="w-3 h-3" /> Nome Wi-Fi (SSID)</label>
                          <input value={techForm.wifi_name} onChange={e=>setTechForm(p=>({...p,wifi_name:e.target.value}))} className="input" placeholder="NomeWifi" />
                        </div>
                        <div>
                          <label className="label">Senha Wi-Fi</label>
                          <div className="relative">
                            <input type="text" value={techForm.wifi_pass} onChange={e=>setTechForm(p=>({...p,wifi_pass:e.target.value}))} className="input pr-10" placeholder="senha wifi" />



                          </div>
                        </div>
                        <div>
                          <label className="label">Lote da Fibra</label>
                          <input value={techForm.fiber_lot} onChange={e=>setTechForm(p=>({...p,fiber_lot:e.target.value}))} className="input" placeholder="Ex: LOTE-2024-001" />
                        </div>
                      </div>
                      <button onClick={()=>saveCliente(os.id)} disabled={saving||uploading} className="btn-primary text-sm w-full" style={{background:'#16a34a'}}>
                        {saving||uploading?'Salvando...':'Salvar Cliente'}
                      </button>
                    </div>
                    {/* ── MATERIAL / DROP ── */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Wrench className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Controle de Material
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div>
                          <label className="label">Número Inicial (DROP)</label>
                          <input type="number" value={techForm.drop_start}
                            onChange={e => setTechForm(p => ({ ...p, drop_start: e.target.value }))}
                            className="input" placeholder="Ex: 100" />
                        </div>
                        <div>
                          <label className="label">Número Final (DROP)</label>
                          <input type="number" value={techForm.drop_end}
                            onChange={e => setTechForm(p => ({ ...p, drop_end: e.target.value }))}
                            className="input" placeholder="Ex: 145" />
                        </div>
                        <div>
                          <label className="label">Total Utilizado (m)</label>
                          <div className="input font-bold" style={{ background: 'var(--table-header)', color: dropTotal() ? 'var(--accent)' : 'var(--text-muted)', cursor: 'not-allowed' }}>
                            {dropTotal() ? `${dropTotal()} m` : '—'}
                          </div>
                        </div>
                      </div>

                      {/* ── Controle de Bobina ── */}
                      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#60a5fa' }}>🧵 Controle da Bobina de DROP</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="label">Comprimento Total da Bobina</label>
                            <input
                              type="number" min="1"
                              value={techForm.spool_total ?? ''}
                              onChange={e => setTechForm(p => ({ ...p, spool_total: e.target.value === '' ? '' : parseFloat(e.target.value) }))}
                              className="input font-bold"
                              placeholder="Ex: 1000"
                            />
                          </div>
                          <div>
                            <label className="label">Usado nesta OS (m)</label>
                            <div className="input font-bold" style={{ background: 'var(--table-header)', color: dropTotal() ? '#f59e0b' : 'var(--text-muted)', cursor: 'not-allowed' }}>
                              {dropTotal() ? `${dropTotal()} m` : '—'}
                            </div>
                          </div>
                          <div>
                            <label className="label">Restante na Bobina (m)</label>
                            {(() => {
                              const spool = parseFloat(techForm.spool_total);
                              const used  = parseFloat(dropTotal());
                              const remaining = !isNaN(spool) && !isNaN(used) ? (spool - used).toFixed(1) : null;
                              return (
                                <div className="input font-bold" style={{ background: 'var(--table-header)', color: remaining !== null ? (parseFloat(remaining) < 50 ? '#f87171' : '#4ade80') : 'var(--text-muted)', cursor: 'not-allowed' }}>
                                  {remaining !== null ? `${remaining} m` : '—'}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Materiais Utilizados</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        {[['mat_bucha','Bucha Acabamento'],['mat_esticador','Esticadores'],['mat_conector','Conectores'],['mat_fixa_cabo','Fixa-cabo']].map(([k, l]) => (
                          <div key={k}>
                            <label className="label">{l}</label>
                            <input type="number" min="0" value={techForm[k] ?? 0}
                              onChange={e => setTechForm(p => ({ ...p, [k]: parseInt(e.target.value) || 0 }))}
                              className="input" />
                          </div>
                        ))}
                      </div>

                      <div className="mb-4">
                        <label className="label">Observações Técnicas</label>
                        <textarea value={techForm.tech_observations}
                          onChange={e => setTechForm(p => ({ ...p, tech_observations: e.target.value }))}
                          className="input h-20 resize-none" placeholder="Anotações da instalação..." />
                      </div>

                      <div className="mb-4 p-3 rounded-xl" style={{ background: '#fffbeb', border: '1px solid #f59e0b' }}>
                        <label className="label flex items-center gap-2" style={{ color: '#92400e' }}>
                          <PenLine className="w-4 h-4" /> Assinatura do Cliente <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <SignaturePad
                          hasSig={!!signatures[os.id]}
                          onSave={sig => setSignatures(p => ({ ...p, [os.id]: sig }))}
                          onClear={() => setSignatures(p => { const n = { ...p }; delete n[os.id]; return n; })}
                        />
                        {!signatures[os.id] && <p style={{ fontSize: 11, color: '#b45309', marginTop: 4 }}>⚠️ O cliente deve assinar antes de finalizar</p>}
                      </div>

                      <div className="flex gap-3 mt-2">
                        <button onClick={() => saveTech(os.id)} disabled={saving} className="btn-primary text-sm flex-1">
                          {saving ? 'Salvando...' : 'Salvar Dados Técnicos'}
                        </button>
                        <button onClick={() => finalizeWithSignature(os.id)} className="text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2" style={{ background: signatures[os.id] ? '#22c55e' : '#9ca3af', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          <CheckCircle className="w-4 h-4" /> Finalizar
                        </button>
                      </div>
                    </div>

                    {/* ── CANCEL + OS DE REDE ── */}
                    {os.status === 'em_execucao' && (
                      <div className="flex flex-wrap gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => setCancelModal(os)} className="btn-danger">
                          <XCircle className="w-4 h-4" /> Cancelar OS
                        </button>
                        {user?.role === 'tecnico' && (
                          <button onClick={() => setMaintenanceModal(os)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                            🔧 Abrir OS de Rede
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── WHATSAPP ── */}
                    <button onClick={() => sendWhatsApp(os)} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white mt-2" style={{background:'#25d366'}}>
                      <MessageCircle className="w-5 h-5" /> Enviar Relatório via WhatsApp (GoldFibra)
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {done.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Histórico ({done.length})</h2>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">OS</th>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Finalizado</th>
                  <th className="table-header"></th>
                </tr></thead>
                <tbody>
                  {done.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>{o.os_number}</td>
                      <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{o.client_name}</td>
                      <td className="table-cell"><StatusBadge s={o.status} /></td>
                      <td className="table-cell">{o.finished_at ? new Date(o.finished_at).toLocaleString('pt-BR') : '—'}</td>
                      <td className="table-cell">
                        {o.status === 'finalizado' && (
                          <button onClick={() => sendWhatsApp(o)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{background:'#25d366'}}>
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* ── MINHAS ORDENS E GANHOS ── */}
      {earnings && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Banknote className="w-4 h-4" /> Minhas Ordens e Ganhos
          </h2>

          {/* Cards resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>A Receber</p>
              <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>
                R$ {Number(earnings.pendente_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.pendente_count || 0} OS pendente(s)</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Já Recebido</p>
              <p className="text-2xl font-black" style={{ color: '#22c55e' }}>
                R$ {Number(earnings.pago_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.pago_count || 0} pagamento(s)</p>
            </div>
            <div className="card text-center">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Geral</p>
              <p className="text-2xl font-black" style={{ color: 'var(--accent)' }}>
                R$ {Number((earnings.pendente_valor || 0) + (earnings.pago_valor || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{earnings.installations || 0} OS finalizadas</p>
            </div>
          </div>

          {/* Tabela detalhada */}
          {earnings.os_list?.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="table-header">OS</th>
                      <th className="table-header">Cliente</th>
                      <th className="table-header">Tipo de Serviço</th>
                      <th className="table-header">Data</th>
                      <th className="table-header">Valor</th>
                      <th className="table-header">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.os_list.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="table-cell font-mono font-bold text-xs" style={{ color: 'var(--accent)' }}>
                          {o.readable_id || o.os_number}
                        </td>
                        <td className="table-cell text-sm" style={{ color: 'var(--text-primary)' }}>{o.client_name || '—'}</td>
                        <td className="table-cell text-xs" style={{ color: '#818cf8' }}>{o.tipo_ordem_servico || '—'}</td>
                        <td className="table-cell text-xs" style={{ color: 'var(--text-muted)' }}>
                          {o.finished_at ? new Date(o.finished_at).toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td className="table-cell font-bold text-sm" style={{ color: '#10b981' }}>
                          R$ {Number(o.valor_servico || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="table-cell">
                          <span className="px-2 py-1 rounded-lg text-xs font-bold"
                            style={{
                              background: o.status_pagamento_tecnico === 'pago' ? '#22c55e22' : '#f59e0b22',
                              color: o.status_pagamento_tecnico === 'pago' ? '#22c55e' : '#f59e0b'
                            }}>
                            {o.status_pagamento_tecnico === 'pago' ? '✔ Recebido' : '⏳ A Receber'}
                          </span>
                          {o.status !== 'finalizado' && o.status_pagamento_tecnico !== 'pago' && (
                            <span className="ml-1 px-2 py-1 rounded-lg text-xs" style={{ background: '#6366f122', color: '#818cf8' }}>
                              {o.status === 'pendente' ? 'Em andamento' : o.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(!earnings.os_list || earnings.os_list.length === 0) && (
            <div className="card text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Nenhuma OS atribuída ainda.
            </div>
          )}

          <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
            ℹ️ Apenas o administrador pode confirmar pagamentos.
          </p>
        </div>
      )}
    </div>

    <AdminDeleteModal
      open={!!deletePhotoModal}
      onClose={() => setDeletePhotoModal(null)}
      onConfirmed={doDeletePhoto}
      itemName="esta foto"
    />
    {cancelModal && (
      <CancelOSModal
        os={cancelModal}
        onConfirm={(data) => handleCancel(cancelModal, data)}
        onClose={() => setCancelModal(null)}
      />
    )}
    {ctoModal && <CTOModal os={ctoModal} onClose={() => setCtoModal(null)} />}
    {maintenanceModal && <MaintenanceModal os={maintenanceModal} onClose={() => setMaintenanceModal(null)} />}
    </>
  );
}
