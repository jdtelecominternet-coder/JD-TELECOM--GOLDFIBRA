import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_LABELS = {
  pendente:    { label: 'Pendente',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  em_execucao: { label: 'Em Execução', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  finalizado:  { label: 'Concluída',   color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  cancelado:   { label: 'Cancelada',   color: '#ef4444', bg: 'rgba(239,68,68,0.15)'  },
};
const CANCEL_REASON_LABELS = {
  cliente_ausente: 'Cliente Ausente', chuva: 'Chuva',
  cliente_cancelou: 'Cliente Cancelou', outro: 'Outro',
};

function fmtTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('pt-BR');
}
function calcDuration(start, end) {
  if (!start || !end) return '--';
  const diff = Math.round((new Date(end) - new Date(start)) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  return `${h}h${diff % 60 > 0 ? (diff % 60) + 'min' : ''}`;
}
function avgLabel(min) {
  if (!min) return '--';
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? (min % 60) + 'min' : ''}`;
}

export default function TechnicianReport() {
  const [technicians, setTechnicians] = useState([]);
  const [filters, setFilters] = useState({ tech_id: '', from: '', to: '', status: 'todas' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.get('/users').then(r => {
      setTechnicians((r.data || []).filter(u => u.role === 'tecnico'));
    }).catch(() => {});
  }, []);

  function handleFilter() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.tech_id) params.append('tech_id', filters.tech_id);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.status !== 'todas') params.append('status', filters.status);
    api.get('/reports/technician?' + params.toString())
      .then(r => setData(r.data))
      .catch(() => alert('Erro ao carregar relatório'))
      .finally(() => setLoading(false));
  }

  function getPhotos(os) {
    const fields = ['photo_cto_open','photo_cto_closed','photo_signal_cto','photo_meter','photo_mac','photo_onu','photo_speedtest'];
    const names  = ['CTO Aberta','CTO Fechada','Sinal CTO','Medidor','MAC','ONU','Speedtest'];
    const result = [];
    fields.forEach((f, i) => { if (os[f]) result.push({ url: os[f], label: names[i] }); });
    if (os.cancel_photos) {
      try {
        const cp = typeof os.cancel_photos === 'string' ? JSON.parse(os.cancel_photos) : os.cancel_photos;
        if (Array.isArray(cp)) cp.forEach((url, i) => result.push({ url, label: `Evidência ${i+1}` }));
      } catch {}
    }
    return result;
  }

  const orders = data?.orders || [];
  const summary = data?.summary || {};

  const inp = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, background: 'var(--bg-input)', color: 'var(--text-primary)' };
  const lbl = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 };

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto', minHeight: '100vh', background: 'var(--bg-main)' }}>

      {/* Título */}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>👨‍🔧</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>Relatório de Técnicos</h2>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>Controle de ordens, tempo e evidências</p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={lbl}>TÉCNICO</label>
          <select value={filters.tech_id} onChange={e => setFilters(f => ({ ...f, tech_id: e.target.value }))} style={inp}>
            <option value="">Todos os Técnicos</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={lbl}>DATA INÍCIO</label>
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} style={inp} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={lbl}>DATA FIM</label>
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} style={inp} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={lbl}>STATUS</label>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={inp}>
            <option value="todas">Todas</option>
            <option value="finalizado">Concluídas</option>
            <option value="cancelado">Canceladas</option>
            <option value="em_execucao">Em Execução</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
        <button onClick={handleFilter} disabled={loading}
          style={{ padding: '9px 24px', borderRadius: 8, background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {loading ? 'Buscando...' : '🔍 Filtrar'}
        </button>
      </div>

      {/* Resumo */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total OS',    value: summary.total || 0,           color: '#3b82f6' },
            { label: 'Concluídas', value: summary.concluidas || 0,       color: '#10b981' },
            { label: 'Canceladas', value: summary.canceladas || 0,       color: '#ef4444' },
            { label: 'Tempo Médio',value: avgLabel(summary.avgMin),      color: '#8b5cf6' },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-card)', border: `1.5px solid ${c.color}40`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {data && orders.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          Nenhuma OS encontrada para os filtros selecionados.
        </div>
      )}

      {/* Lista */}
      {orders.map(os => {
        const st = STATUS_LABELS[os.status] || STATUS_LABELS.pendente;
        const photos = getPhotos(os);
        const isExpanded = expanded === os.id;
        const duration = calcDuration(os.started_at || os.arrived_at, os.finished_at || os.cancel_at);

        return (
          <div key={os.id} style={{ background: 'var(--bg-card)', borderRadius: 12, marginBottom: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Status topo */}
            <div style={{ background: st.bg, padding: '4px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: st.color, fontSize: 12 }}>{st.label}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(os.created_at)}</span>
            </div>

            {/* Header */}
            <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : os.id)}>

              <div style={{ flex: '1 1 100px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nº OS</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{os.readable_id || os.os_number}</div>
              </div>
              <div style={{ flex: '2 1 160px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cliente</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{os.client_name || '—'}</div>
                {os.city && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{os.neighborhood}, {os.city}</div>}
              </div>
              <div style={{ flex: '1 1 130px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Técnico</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{os.tech_name || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{os.tech_login}</div>
              </div>
              <div style={{ flex: '1 1 130px', background: 'var(--bg-input)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Chegada / Saída</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  ▶ {fmtTime(os.arrived_at || os.started_at)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                  ■ {fmtTime(os.finished_at || os.cancel_at)}
                </div>
                <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 700 }}>⏱ {duration}</div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
            </div>

            {/* Expandido */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'var(--bg-main)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
                  {[
                    { label: 'Tipo de Serviço', value: os.tipo_ordem_servico },
                    { label: 'Hora de Início', value: fmtTime(os.started_at) },
                    { label: 'Hora de Finalização', value: fmtTime(os.finished_at) },
                    { label: 'Vendedor', value: os.seller_name },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{item.label}</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.value || '—'}</div>
                    </div>
                  ))}
                </div>

                {os.status === 'cancelado' && os.cancel_reason && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Motivo do Cancelamento</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{CANCEL_REASON_LABELS[os.cancel_reason] || os.cancel_reason}</div>
                    {os.cancel_description && <div style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 13 }}>{os.cancel_description}</div>}
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Cancelado: {fmtDate(os.cancel_at)} às {fmtTime(os.cancel_at)}</div>
                  </div>
                )}

                {(os.observations || os.tech_observations) && (
                  <div style={{ marginBottom: 14 }}>
                    {os.observations && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Observação Geral</div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}>{os.observations}</div>
                      </div>
                    )}
                    {os.tech_observations && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Observação do Técnico</div>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)' }}>{os.tech_observations}</div>
                      </div>
                    )}
                  </div>
                )}

                {photos.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
                      📷 Fotos ({photos.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {photos.map((p, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <img src={p.url} alt={p.label} onClick={() => setLightbox(p.url)}
                            style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid var(--border)' }} />
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }}>×</button>
          <a href={lightbox} download
            style={{ position: 'absolute', bottom: 24, background: '#2563eb', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            ⬇ Baixar Foto
          </a>
        </div>
      )}
    </div>
  );
}
