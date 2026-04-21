import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Camera, ChevronDown, ChevronUp, RefreshCw, Clock, Eye, Navigation } from 'lucide-react';

function openMaps(item) {
  const addr = [item.street, item.addr_number, item.neighborhood, item.city, item.state].filter(Boolean).join(', ');
  if (!addr || addr.trim() === '') { toast.error('Endereço do cliente não cadastrado'); return; }
  // Tenta abrir com coordenadas se disponível, senão pelo endereço
  if (item.latitude && item.longitude) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}&travelmode=driving`, '_blank');
  } else {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`, '_blank');
  }
}

const STATUS_LABEL = {
  aguardando: { label: 'Aguardando Análise', color: '#f59e0b' },
  aprovado:   { label: 'Aprovado',           color: '#22c55e' },
  retornado:  { label: 'Retornado',          color: '#ef4444' },
};

function PhotoGrid({ photos }) {
  if (!photos || !photos.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {photos.map((p, i) => (
        <img key={i} src={p} alt={`foto-${i}`} className="w-20 h-20 object-cover rounded-lg cursor-pointer border"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => window.open(p, '_blank')} />
      ))}
    </div>
  );
}

function compressImage(file, maxKB = 300) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > 1200) { h = Math.round(h * 1200 / w); w = 1200; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        let q = 0.7;
        const tryCompress = () => {
          const data = canvas.toDataURL('image/jpeg', q);
          if (data.length / 1024 <= maxKB || q <= 0.2) { resolve(data); return; }
          q -= 0.1; tryCompress();
        };
        tryCompress();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function playQcSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.15, 0.3].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = [880, 1100, 880][i];
      g.gain.setValueAtTime(0.4, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
    });
  } catch(_) {}
}

export default function QualityControl() {
  const { user } = useAuth();
  const chatCtx = useChat();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('aguardando');
  const [returnModal, setReturnModal] = useState(null);
  const [returnObs, setReturnObs] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/quality-control');
      setItems(r.data);
    } catch { toast.error('Erro ao carregar CQ'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Atualização em tempo real
  useEffect(() => {
    const socket = chatCtx?.socket;
    if (!socket) return;
    const onRefresh = () => load();
    const onCorrigida = () => {
      load();
      playQcSound();
      toast('🔔 Técnico enviou correção — OS aguarda revisão!', {
        icon: '✅',
        duration: 10000,
        style: { background: '#166534', color: '#fff', fontWeight: 700 },
      });
    };
    socket.on('data:refresh', onRefresh);
    socket.on('os:corrigida', onCorrigida);
    return () => { socket.off('data:refresh', onRefresh); socket.off('os:corrigida', onCorrigida); };
  }, [chatCtx?.socket, load]);

  async function handleApprove(item) {
    if (!confirm(`Aprovar OS ${item.readable_id}? Isso mudará o pagamento do técnico para "A Receber".`)) return;
    try {
      await api.post(`/quality-control/approve/${item.id}`, { obs: '' });
      toast.success('OS aprovada! Pagamento atualizado para "A Receber".');
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao aprovar'); }
  }

  async function handleReturn() {
    if (!returnObs.trim()) { toast.error('Informe o motivo do retorno'); return; }
    setSubmitting(true);
    try {
      await api.post(`/quality-control/return/${returnModal.id}`, {
        obs: returnObs,
        photos: returnPhotos,
      });
      toast.success('OS retornada para o técnico.');
      setReturnModal(null); setReturnObs(''); setReturnPhotos([]);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao retornar'); }
    finally { setSubmitting(false); }
  }

  async function addReturnPhoto(e) {
    const files = Array.from(e.target.files);
    if (returnPhotos.length + files.length > 10) { toast.error('Máximo 10 fotos'); return; }
    const compressed = await Promise.all(files.map(f => compressImage(f)));
    setReturnPhotos(p => [...p, ...compressed]);
  }

  const filtered = items.filter(i => filter === 'todos' || i.status === filter);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Controle de Qualidade</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Vistoria e validação de Ordens de Serviço finalizadas</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[['aguardando','Aguardando'],['aprovado','Aprovados'],['retornado','Retornados'],['todos','Todos']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: filter === v ? 'var(--accent)' : 'var(--bg-input)', color: filter === v ? '#fff' : 'var(--text-muted)' }}>
            {l} {v !== 'todos' && <span className="ml-1 opacity-70">({items.filter(i => i.status === v).length})</span>}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /></div>}

      {!loading && filtered.length === 0 && (
        <div className="card p-10 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--accent)' }} />
          <p className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>Nenhuma OS {filter !== 'todos' ? `com status "${filter}"` : ''}</p>
        </div>
      )}

      {/* Lista de OSs */}
      {filtered.map(item => {
        const st = STATUS_LABEL[item.status] || STATUS_LABEL.aguardando;
        const isOpen = expanded === item.id;
        const techPhotos = (() => { try { return JSON.parse(item.tech_photos || '[]'); } catch { return []; } })();
        const supervisorPhotos = (() => { try { return JSON.parse(item.supervisor_photos || '[]'); } catch { return []; } })();
        const correctionPhotos = (() => { try { return JSON.parse(item.tech_correction_photos || '[]'); } catch { return []; } })();

        return (
          <div key={item.id} className="card overflow-hidden" style={{ border: `1px solid ${st.color}44` }}>
            {/* Cabeçalho do card */}
            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(isOpen ? null : item.id)}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{item.readable_id}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: st.color + '20', color: st.color }}>{st.label}</span>
                  {item.cycle > 1 && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#6366f120', color: '#818cf8' }}>Ciclo {item.cycle}</span>}
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.client_name} · Técnico: {item.tech_name} · {item.tipo_ordem_servico || 'Serviço'}
                </p>
                {/* Endereço + botão rota */}
                {(item.street || item.city) && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      📍 {[item.street, item.addr_number, item.neighborhood, item.city].filter(Boolean).join(', ')}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); openMaps(item); }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: '#1a73e8', flexShrink: 0 }}>
                      <Navigation className="w-3 h-3" /> Iniciar Rota
                    </button>
                  </div>
                )}
                {item.supervisor_obs && item.status === 'retornado' && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: '#ef4444' }}>⚠️ {item.supervisor_obs}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.status === 'aguardando' && (
                  <>
                    <button onClick={e => { e.stopPropagation(); handleApprove(item); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: '#22c55e' }}>
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button onClick={e => { e.stopPropagation(); setReturnModal(item); setReturnObs(''); setReturnPhotos([]); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                      style={{ background: '#ef4444' }}>
                      <XCircle className="w-3.5 h-3.5" /> Retornar
                    </button>
                  </>
                )}
                {isOpen ? <ChevronUp className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>

            {/* Detalhes expandidos */}
            {isOpen && (
              <div className="px-4 pb-4 space-y-4" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3">
                  {[
                    ['Cliente', item.client_name],
                    ['Técnico', item.tech_name],
                    ['Tipo', item.tipo_ordem_servico || '—'],
                    ['Valor', item.valor_servico ? `R$ ${Number(item.valor_servico).toFixed(2)}` : '—'],
                    ['Endereço', [item.street, item.addr_number, item.neighborhood, item.city].filter(Boolean).join(', ') || '—'],
                    ['Data', item.scheduled_date || '—'],
                    ['Ciclo', item.cycle],
                    ['Supervisor', item.supervisor_name || '—'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <p className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{l}</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{v}</p>
                    </div>
                  ))}
                </div>

                {/* Observações da OS */}
                {item.tech_observations && (
                  <div className="rounded-xl p-3" style={{ background: 'var(--bg-input)' }}>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Observações do Técnico</p>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{item.tech_observations}</p>
                  </div>
                )}

                {/* Fotos do técnico */}
                {techPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--text-muted)' }}>Fotos do Técnico ({techPhotos.length})</p>
                    <PhotoGrid photos={techPhotos} />
                  </div>
                )}

                {/* Fotos de correção do técnico */}
                {correctionPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#6366f1' }}>Fotos de Correção ({correctionPhotos.length})</p>
                    <PhotoGrid photos={correctionPhotos} />
                    {item.tech_obs && <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}><b>Obs correção:</b> {item.tech_obs}</p>}
                  </div>
                )}

                {/* Observações do supervisor (retorno anterior) */}
                {supervisorPhotos.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase mb-1" style={{ color: '#ef4444' }}>Fotos do Supervisor</p>
                    <PhotoGrid photos={supervisorPhotos} />
                  </div>
                )}

                {/* Link relatório */}
                <a href={`/relatorio/${item.os_id}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                  <Eye className="w-4 h-4" /> Ver relatório completo
                </a>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal de retorno */}
      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <h3 className="text-lg font-black mb-1" style={{ color: 'var(--text-primary)' }}>Retornar OS para Técnico</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{returnModal.readable_id} · {returnModal.tech_name}</p>

            <label className="label">Motivo do retorno *</label>
            <textarea
              value={returnObs}
              onChange={e => setReturnObs(e.target.value)}
              rows={4}
              placeholder="Descreva o problema encontrado para o técnico corrigir..."
              className="input w-full mb-3"
            />

            {/* Fotos do supervisor */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Fotos de evidência (opcional, máx. 10)</label>
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ background: 'var(--bg-input)', color: 'var(--accent)' }}>
                  <Camera className="w-3.5 h-3.5" /> Adicionar foto
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={addReturnPhoto} className="hidden" />
              </div>
              <PhotoGrid photos={returnPhotos} />
              {returnPhotos.length > 0 && (
                <button onClick={() => setReturnPhotos([])} className="text-xs mt-1" style={{ color: '#ef4444' }}>Remover todas</button>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setReturnModal(null)} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleReturn} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: '#ef4444' }}>
                {submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                Retornar OS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
