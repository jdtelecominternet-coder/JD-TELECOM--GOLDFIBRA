import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, CheckCircle, XCircle, Truck, Wrench, Upload, ChevronDown, ChevronUp, MapPin, Copy, Check, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [techForm, setTechForm] = useState({});
  const [photos, setPhotos] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRefs = useRef({});

  async function load() {
    try { const r = await api.get('/orders'); setOrders(r.data); }
    catch {} finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

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
      mat_esticador: os.mat_esticador ?? 0,
      mat_conector: os.mat_conector ?? 0,
      mat_bucha: os.mat_bucha ?? 0,
      mat_fixa_cabo: os.mat_fixa_cabo ?? 0,
      tech_observations: os.tech_observations || ''
    });
    setPhotos({});
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
      await api.put(`/orders/${id}/technical`, techForm);
      toast.success('Dados técnicos salvos!');
      load();
    } catch { toast.error('Erro ao salvar'); }
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

  const active = orders.filter(o => !['finalizado','cancelado'].includes(o.status));
  const done   = orders.filter(o => ['finalizado','cancelado'].includes(o.status));

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
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
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge s={os.status} />
                    {/* Photo progress */}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${allPhotosDone ? 'bg-green-500/15 text-green-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
                      {photoDone}/{photoTotal} fotos
                    </span>
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

                    {/* ── 7 PHOTOS ── */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Camera className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        Fotos da Instalação
                        <span className="text-xs text-red-400 font-normal">(Todas obrigatórias para finalizar)</span>
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {PHOTO_FIELDS.map(({ key, label }) => (
                          <div key={key} className="rounded-xl p-3" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <p className="text-xs font-semibold mb-2 text-center" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                            {os[key] ? (
                              <div className="relative">
                                <a href={os[key]} target="_blank" rel="noreferrer">
                                  <img src={os[key]} alt={label} className="w-full h-24 object-cover rounded-lg" />
                                </a>
                                <span className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </span>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center h-24 rounded-lg cursor-pointer transition-colors"
                                style={{ border: `2px dashed ${photos[key] ? 'var(--accent)' : 'var(--border)'}` }}>
                                <Upload className="w-5 h-5 mb-1" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-xs text-center px-1" style={{ color: 'var(--text-muted)' }}>
                                  {photos[key] ? '✓ Selecionada' : 'Toque para adicionar'}
                                </span>
                                <input type="file" accept="image/*" capture="environment" className="hidden"
                                  onChange={e => setPhotos(p => ({ ...p, [key]: e.target.files[0] }))} />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                      {Object.values(photos).some(Boolean) && (
                        <button onClick={() => uploadPhotos(os.id)} disabled={uploading} className="btn-primary mt-3 text-sm">
                          <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : `Enviar Fotos (${Object.values(photos).filter(Boolean).length})`}
                        </button>
                      )}
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

                      <button onClick={() => saveTech(os.id)} disabled={saving} className="btn-primary text-sm">
                        {saving ? 'Salvando...' : 'Salvar Dados Técnicos'}
                      </button>
                    </div>

                    {/* ── FINISH / CANCEL ── */}
                    {os.status === 'em_execucao' && (
                      <div className="flex flex-wrap gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                        <button onClick={() => updateStatus(os.id, 'finalizado')} className="btn-primary">
                          <CheckCircle className="w-4 h-4" /> Finalizar Serviço
                        </button>
                        <button onClick={() => { if (confirm('Cancelar serviço?')) updateStatus(os.id, 'cancelado'); }} className="btn-danger">
                          <XCircle className="w-4 h-4" /> Cancelar
                        </button>
                      </div>
                    )}
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
                </tr></thead>
                <tbody>
                  {done.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>{o.os_number}</td>
                      <td className="table-cell" style={{ color: 'var(--text-primary)' }}>{o.client_name}</td>
                      <td className="table-cell"><StatusBadge s={o.status} /></td>
                      <td className="table-cell">{o.finished_at ? new Date(o.finished_at).toLocaleString('pt-BR') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
