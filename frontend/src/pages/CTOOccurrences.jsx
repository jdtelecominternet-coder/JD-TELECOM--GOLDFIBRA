import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Wifi, ChevronDown, ChevronUp, MapPin, Trash2, RefreshCw } from 'lucide-react';

const PROBLEM_LABELS = {
  sem_sinal:      { label: 'Sem Sinal',       color: '#ef4444', emoji: '🔴' },
  sinal_alterado: { label: 'Sinal Alterado',   color: '#f59e0b', emoji: '🟡' },
  cto_quebrada:   { label: 'CTO Quebrada',     color: '#8b5cf6', emoji: '⚫' },
  cto_caida:      { label: 'CTO Caída',        color: '#dc2626', emoji: '🔻' },
  cabo_rompido:   { label: 'Cabo Rompido',     color: '#3b82f6', emoji: '⚡' },
};

function fmtDateTime(iso) {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function CTOOccurrences() {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filters, setFilters]       = useState({ tech_id: '', problem_type: '', cto_number: '', from: '', to: '' });
  const [technicians, setTechnicians] = useState([]);
  const [lightbox, setLightbox]     = useState(null);
  const [expanded, setExpanded]     = useState(null);

  useEffect(() => {
    api.get('/users').then(r => setTechnicians((r.data || []).filter(u => u.role === 'tecnico'))).catch(() => {});
    load();
  }, []);

  function load(f = filters) {
    setLoading(true);
    const params = new URLSearchParams();
    if (f.tech_id)      params.append('tech_id', f.tech_id);
    if (f.problem_type) params.append('problem_type', f.problem_type);
    if (f.cto_number)   params.append('cto_number', f.cto_number);
    if (f.from)         params.append('from', f.from);
    if (f.to)           params.append('to', f.to);
    api.get('/maintenance?' + params.toString())
      .then(r => setItems(r.data || []))
      .catch(() => toast.error('Erro ao carregar ocorrências'))
      .finally(() => setLoading(false));
  }

  async function deleteItem(id) {
    if (!window.confirm('Excluir esta ocorrência?')) return;
    try {
      await api.delete(`/maintenance/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Ocorrência removida');
    } catch { toast.error('Erro ao remover'); }
  }

  const byCat = {};
  items.forEach(i => { byCat[i.problem_type] = (byCat[i.problem_type] || 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Wifi className="w-7 h-7" style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Ocorrências de CTO</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Problemas reportados pelos técnicos de campo</p>
          </div>
        </div>
        <button onClick={() => load()} disabled={loading} className="btn-secondary p-2" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Cards resumo */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(PROBLEM_LABELS).map(([k, v]) => byCat[k] ? (
            <div key={k} className="card px-4 py-3 flex items-center gap-3" style={{ border: `1.5px solid ${v.color}50` }}>
              <span className="text-2xl">{v.emoji}</span>
              <div>
                <div className="text-xl font-black" style={{ color: v.color }}>{byCat[k]}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.label}</div>
              </div>
            </div>
          ) : null)}
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <div className="text-xl font-black" style={{ color: 'var(--accent)' }}>{items.length}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="label">Técnico</label>
            <select value={filters.tech_id} onChange={e => setFilters(f => ({ ...f, tech_id: e.target.value }))} className="input">
              <option value="">Todos</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tipo de Problema</label>
            <select value={filters.problem_type} onChange={e => setFilters(f => ({ ...f, problem_type: e.target.value }))} className="input">
              <option value="">Todos</option>
              {Object.entries(PROBLEM_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nº CTO</label>
            <input value={filters.cto_number} onChange={e => setFilters(f => ({ ...f, cto_number: e.target.value }))}
              placeholder="Ex: CTO-123" className="input" />
          </div>
          <div>
            <label className="label">Data Início</label>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className="input" />
          </div>
          <div>
            <label className="label">Data Fim</label>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className="input" />
          </div>
        </div>
        <button onClick={() => load(filters)} disabled={loading} className="btn-primary mt-3">
          {loading ? 'Buscando...' : 'Filtrar'}
        </button>
      </div>

      {/* Vazio */}
      {!loading && items.length === 0 && (
        <div className="card text-center py-10" style={{ color: 'var(--text-muted)' }}>
          <Wifi className="w-10 h-10 mx-auto mb-2 opacity-30" />
          Nenhuma ocorrência encontrada.
        </div>
      )}

      {/* Lista */}
      {items.map(item => {
        const pt = PROBLEM_LABELS[item.problem_type] || { label: item.problem_type, color: '#64748b', emoji: '⚠️' };
        const photos = (() => { try { return JSON.parse(item.photos || '[]'); } catch { return []; } })();
        const isExp = expanded === item.id;

        return (
          <div key={item.id} className="card p-0 overflow-hidden" style={{ border: `1.5px solid ${pt.color}30` }}>
            <div className="p-4 flex flex-wrap gap-3 items-center cursor-pointer"
              onClick={() => setExpanded(isExp ? null : item.id)}>

              <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${pt.color}20`, color: pt.color }}>
                {pt.emoji} {pt.label}
              </span>

              <div className="flex-1 min-w-28">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>CTO</div>
                <div className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{item.cto_number}</div>
              </div>

              <div className="flex-1 min-w-32">
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Técnico</div>
                <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.tech_name}</div>
              </div>

              {item.os_number && (
                <div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>OS</div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--accent)' }}>{item.readable_id || item.os_number}</div>
                </div>
              )}

              <div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Data</div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fmtDateTime(item.created_at)}</div>
              </div>

              <div className="flex gap-2 items-center">
                {photos.length > 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>📷 {photos.length}</span>}
                <button onClick={e => { e.stopPropagation(); deleteItem(item.id); }} className="p-1 rounded" style={{ color: '#f87171' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
                {isExp ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
              </div>
            </div>

            {isExp && (
              <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-input)' }}>
                {item.latitude && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Localização</div>
                    <a href={`https://maps.google.com/?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#3b82f6' }}>
                      <MapPin className="w-4 h-4" /> Ver no mapa ({Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)})
                    </a>
                  </div>
                )}
                {item.geo_address && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>📍 {item.geo_address}</p>
                )}
                {item.observations && (
                  <div>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Observação</div>
                    <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{item.observations}</p>
                  </div>
                )}
                {photos.length > 0 && (
                  <div>
                    <div className="text-xs mb-2 font-bold" style={{ color: 'var(--text-muted)' }}>Fotos de Evidência</div>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((p, i) => (
                        <img key={i} src={p} alt={`foto ${i + 1}`} onClick={() => setLightbox(p)}
                          className="w-24 h-20 object-cover rounded-lg cursor-pointer"
                          style={{ border: `2px solid ${pt.color}50` }} />
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
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.92)' }}>
          <img src={lightbox} alt="Evidência" className="max-w-full max-h-full rounded-xl" style={{ maxWidth: '92vw', maxHeight: '88vh' }} />
        </div>
      )}
    </div>
  );
}
