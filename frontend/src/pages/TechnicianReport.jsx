import React, { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS_LABELS = {
  pendente: { label: 'Pendente', color: '#f59e0b', bg: '#fef3c7' },
  em_execucao: { label: 'Em Execução', color: '#3b82f6', bg: '#dbeafe' },
  finalizado: { label: 'Concluída', color: '#10b981', bg: '#d1fae5' },
  cancelado: { label: 'Cancelada', color: '#ef4444', bg: '#fee2e2' },
};

const CANCEL_REASON_LABELS = {
  cliente_ausente: 'Cliente Ausente',
  chuva: 'Chuva',
  cliente_cancelou: 'Cliente Cancelou',
  outro: 'Outro',
};

function fmtTime(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR');
}
function calcDuration(start, end) {
  if (!start || !end) return '--';
  const diff = Math.round((new Date(end) - new Date(start)) / 60000);
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return `${h}h${m > 0 ? m + 'min' : ''}`;
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
    const fields = ['photo_cto_open', 'photo_cto_closed', 'photo_signal_cto', 'photo_meter', 'photo_mac', 'photo_onu', 'photo_speedtest'];
    const names = ['CTO Aberta', 'CTO Fechada', 'Sinal CTO', 'Medidor', 'MAC', 'ONU', 'Speedtest'];
    const result = [];
    fields.forEach((f, i) => { if (os[f]) result.push({ url: os[f], label: names[i] }); });
    // Cancel photos
    if (os.cancel_photos) {
      try {
        const cp = typeof os.cancel_photos === 'string' ? JSON.parse(os.cancel_photos) : os.cancel_photos;
        if (Array.isArray(cp)) cp.forEach((url, i) => result.push({ url, label: `Evidência ${i + 1}` }));
      } catch (_) {}
    }
    return result;
  }

  const orders = data?.orders || [];
  const summary = data?.summary || {};

  return (
    <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto', background: '#f1f5f9', minHeight: '100vh' }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 20, background: '#fff', padding: '14px 20px', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        Relatório de Técnicos
      </h2>

      {/* Filtros */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>TÉCNICO</label>
          <select value={filters.tech_id} onChange={e => setFilters(f => ({ ...f, tech_id: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', color: '#1e293b' }}>
            <option value="">Todos os Técnicos</option>
            {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>DATA INÍCIO</label>
          <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', color: '#1e293b' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>DATA FIM</label>
          <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', color: '#1e293b' }} />
        </div>
        <div style={{ flex: '1 1 150px' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>STATUS</label>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#fff', color: '#1e293b' }}>
            <option value="todas">Todas</option>
            <option value="finalizado">Concluídas</option>
            <option value="cancelado">Canceladas</option>
            <option value="em_execucao">Em Execução</option>
            <option value="pendente">Pendentes</option>
          </select>
        </div>
        <button onClick={handleFilter} disabled={loading}
          style={{ padding: '8px 22px', borderRadius: 8, background: '#1e50b4', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {loading ? 'Buscando...' : 'Filtrar'}
        </button>
      </div>

      {/* Cards de resumo */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total de OS', value: summary.total || 0, color: '#3b82f6', bg: '#dbeafe' },
            { label: 'Concluídas', value: summary.concluidas || 0, color: '#10b981', bg: '#d1fae5' },
            { label: 'Canceladas', value: summary.canceladas || 0, color: '#ef4444', bg: '#fee2e2' },
            { label: 'Tempo Médio', value: avgLabel(summary.avgMin), color: '#8b5cf6', bg: '#ede9fe' },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '14px 16px', textAlign: 'center', border: `1.5px solid ${c.color}30` }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de OS */}
      {data && orders.length === 0 && (
        <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40, background: '#fff', borderRadius: 12 }}>
          Nenhuma OS encontrada para os filtros selecionados.
        </div>
      )}

      {orders.map(os => {
        const st = STATUS_LABELS[os.status] || STATUS_LABELS.pendente;
        const photos = getPhotos(os);
        const isExpanded = expanded === os.id;
        const duration = calcDuration(os.started_at || os.arrived_at, os.finished_at || os.cancel_at);

        return (
          <div key={os.id} style={{ background: '#fff', borderRadius: 12, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', border: '1.5px solid #f1f5f9' }}>
            {/* Cabeçalho */}
            <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : os.id)}>

              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Nº OS</div>
                <div style={{ fontWeight: 700, color: '#1e3a5f' }}>{os.readable_id || os.os_number}</div>
              </div>

              <div style={{ flex: '2 1 180px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Cliente</div>
                <div style={{ fontWeight: 600, color: '#334155' }}>{os.client_name || '—'}</div>
                {os.city && <div style={{ fontSize: 11, color: '#94a3b8' }}>{os.neighborhood}, {os.city}</div>}
              </div>

              <div style={{ flex: '1 1 140px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Técnico</div>
                <div style={{ fontWeight: 600, color: '#334155' }}>{os.tech_name || '—'}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{os.tech_login}</div>
              </div>

              <div style={{ flex: '1 1 100px', textAlign: 'center' }}>
                <span style={{ padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 12, fontWeight: 700 }}>
                  {st.label}
                </span>
              </div>

              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Data</div>
                <div style={{ fontWeight: 600, color: '#334155' }}>{fmtDate(os.created_at)}</div>
              </div>

              {/* Controle de tempo */}
              <div style={{ flex: '1 1 160px', background: '#f8fafc', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>Controle de Tempo</div>
                <div style={{ fontSize: 12, color: '#334155' }}>
                  <span style={{ marginRight: 6 }}>Chegada: <b>{fmtTime(os.arrived_at || os.started_at)}</b></span>
                </div>
                <div style={{ fontSize: 12, color: '#334155' }}>
                  <span style={{ marginRight: 6 }}>Saída: <b>{fmtTime(os.finished_at || os.cancel_at)}</b></span>
                </div>
                <div style={{ fontSize: 12, color: '#6366f1', fontWeight: 700 }}>
                  Total: {duration}
                </div>
              </div>

              <div style={{ fontSize: 18, color: '#94a3b8' }}>{isExpanded ? '▲' : '▼'}</div>
            </div>

            {/* Detalhes expandidos */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px 18px', background: '#fafafa' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Tipo de Serviço</div>
                    <div style={{ fontWeight: 600 }}>{os.tipo_ordem_servico || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Hora de Início</div>
                    <div style={{ fontWeight: 600 }}>{fmtTime(os.started_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Hora de Finalização</div>
                    <div style={{ fontWeight: 600 }}>{fmtTime(os.finished_at)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Vendedor</div>
                    <div style={{ fontWeight: 600 }}>{os.seller_name || '—'}</div>
                  </div>
                </div>

                {/* Cancelamento */}
                {os.status === 'cancelado' && os.cancel_reason && (
                  <div style={{ background: '#fff1f2', border: '1.5px solid #fecdd3', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>Motivo do Cancelamento</div>
                    <div style={{ fontWeight: 600 }}>{CANCEL_REASON_LABELS[os.cancel_reason] || os.cancel_reason}</div>
                    {os.cancel_description && <div style={{ marginTop: 6, color: '#64748b', fontSize: 13 }}>{os.cancel_description}</div>}
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Cancelado em: {fmtDate(os.cancel_at)} às {fmtTime(os.cancel_at)}</div>
                  </div>
                )}

                {/* Observações */}
                {(os.observations || os.tech_observations) && (
                  <div style={{ marginBottom: 14 }}>
                    {os.observations && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Observação Geral</div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{os.observations}</div>
                      </div>
                    )}
                    {os.tech_observations && (
                      <div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Observação do Técnico</div>
                        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{os.tech_observations}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fotos */}
                {photos.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
                      Fotos ({photos.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      {photos.map((p, i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <img src={p.url} alt={p.label}
                            onClick={() => setLightbox(p.url)}
                            style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #e2e8f0' }} />
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{p.label}</div>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={lightbox} alt="Foto" style={{ maxWidth: '92vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }}>×</button>
          <a href={lightbox} download
            style={{ position: 'absolute', bottom: 24, background: '#1e50b4', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            Baixar Foto
          </a>
        </div>
      )}
    </div>
  );
}
