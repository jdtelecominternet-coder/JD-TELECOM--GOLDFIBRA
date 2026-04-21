import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { compressImage } from '../utils/imageUtils';
import { useAutoSave } from '../utils/useAutoSave';

const STATUS = {
  aguardando:      { label: '🔴 CTO com Problema',   color: '#dc2626', bg: '#fee2e2' },
  em_deslocamento: { label: '🟡 Em Manutenção',       color: '#d97706', bg: '#fef3c7' },
  em_andamento:    { label: '🟡 Em Manutenção',       color: '#d97706', bg: '#fef3c7' },
  concluido:       { label: '🟢 Sinal Normalizado',   color: '#16a34a', bg: '#dcfce7' },
};

const PROBLEM_LABELS = {
  sem_sinal: 'CTO sem sinal', sinal_alterado: 'Sinal alterado',
  cto_quebrada: 'CTO quebrada', cto_caida: 'CTO caída',
  cabo_rompido: 'Cabo rompido', outro: 'Outro',
};

function calcDuration(start, end) {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end) - new Date(start)) / 60000);
  if (diff < 60) return `${diff}min`;
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? (diff % 60) + 'min' : ''}`;
}

function fmtDateTime(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function OSTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startedAt) return;
    // Fix: SQLite retorna UTC sem 'Z' — adiciona para interpretar corretamente
    const iso = startedAt.endsWith('Z') || startedAt.includes('+') ? startedAt : startedAt.replace(' ', 'T') + 'Z';
    const start = new Date(iso).getTime();
    const iv = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(iv);
  }, [startedAt]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const limit = 7200;
  const color = elapsed < limit * 0.5 ? '#16a34a' : elapsed < limit ? '#d97706' : '#dc2626';
  const pct = Math.min((elapsed / limit) * 100, 100);
  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>⏱ Tempo em serviço</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'monospace' }}>
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      </div>
      <div style={{ height: 6, borderRadius: 4, background: '#e2e8f0', marginTop: 8, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 4, transition: 'width 1s' }} />
      </div>
      {elapsed >= limit && <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 700, marginTop: 4 }}>⚠️ Tempo limite ultrapassado!</div>}
    </div>
  );
}

export default function NetworkService() {
  const { user } = useAuth();
  const chatCtx = useChat();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [finishing, setFinishing] = useState(null);
  const [finishForm, setFinishForm, clearFinishForm] = useAutoSave('net_finish_form', { observations: '', photos: [], signal_after: '' });
  const [finishingId, setFinishingId, clearFinishingId] = useAutoSave('net_finishing_id', null);
  const [lightbox, setLightbox] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const fileRef = useRef();
  const isMaintenance = user?.role === 'manutencao';
  const isAdmin = user?.role === 'admin';

  function load() {
    setLoading(true);
    api.get('/maintenance').then(r => setOrders(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (finishingId) { setFinishing(finishingId); setExpanded(finishingId); }
    const socket = chatCtx?.socket;
    if (socket) {
      socket.on('rede:nova_os', load);
      return () => socket.off('rede:nova_os', load);
    }
  }, []);

  async function accept(id) {
    setActionLoading(id + '_accept');
    try { await api.put(`/maintenance/${id}/accept`); load(); } catch(e) { alert(e.response?.data?.error || 'Erro'); }
    setActionLoading(null);
  }

  function openRoute(lat, lng) {
    if (!lat || !lng) return alert('Localização não disponível.');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, '_blank');
  }

  async function updateStatus(id, status, extra = {}) {
    setActionLoading(id + '_' + status);
    let geo = null;
    try {
      geo = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(
        p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), rej, { timeout: 8000 }
      ));
    } catch {}

    if (status === 'concluido' && !geo?.lat) {
      alert('❌ GPS obrigatório para finalizar. Ative o GPS e tente novamente.');
      setActionLoading(null);
      return;
    }
    try {
      await api.put(`/maintenance/${id}/status`, { status, latitude: geo?.lat, longitude: geo?.lng, ...extra });
      clearFinishForm(); clearFinishingId();
      setFinishing(null);
      load();
    } catch(e) { alert(e.response?.data?.error || 'Erro ao atualizar'); }
    setActionLoading(null);
  }

  function handleFinishPhoto(e) {
    Array.from(e.target.files).forEach(async file => {
      const compressed = await compressImage(file);
      setFinishForm(f => ({ ...f, photos: [...f.photos, compressed] }));
    });
  }

  const pendentes = orders.filter(o => o.status === 'aguardando').length;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: '0 auto', background: 'var(--bg-main)', minHeight: '100vh' }}>
      {/* Título */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', borderRadius: 14, padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff' }}>🔧 Serviço de Rede</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Ordens de manutenção de infraestrutura</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pendentes > 0 && (
            <span style={{ background: '#dc2626', color: '#fff', fontWeight: 800, borderRadius: 20, padding: '4px 12px', fontSize: 14 }}>
              🔴 {pendentes} pendente{pendentes > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={load} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
            Atualizar
          </button>
        </div>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { k: 'aguardando', label: '🔴 Com Problema' },
          { k: 'em_deslocamento', label: '🟡 Deslocamento' },
          { k: 'em_andamento', label: '🟡 Em Andamento' },
          { k: 'concluido', label: '🟢 Normalizado' },
        ].map(({ k, label }) => {
          const st = STATUS[k];
          return (
            <div key={k} style={{ background: st.bg, border: `1.5px solid ${st.color}30`, borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: st.color }}>{orders.filter(o => o.status === k).length}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          );
        })}
      </div>

      {loading && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando...</div>}
        {!loading && orders.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          Nenhuma ordem no momento.
        </div>
      )}

      {orders.map(mo => {
        const st = STATUS[mo.status] || STATUS.aguardando;
        const isExp = expanded === mo.id;
        const photosBefore = (() => { try { return JSON.parse(mo.photos_before || '[]'); } catch { return []; } })();
        const photosAfter  = (() => { try { return JSON.parse(mo.photos_after  || '[]'); } catch { return []; } })();
        const duration = calcDuration(mo.started_at, mo.finished_at);
        const isMine = mo.assigned_tech_id === user?.id;

        return (
          <div key={mo.id} style={{ background: 'var(--bg-card)', borderRadius: 14, marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden', border: `2px solid ${st.color}40` }}>
            {/* Status banner */}
            <div style={{ background: st.bg, padding: '6px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, color: st.color, fontSize: 13 }}>{st.label}</span>
              {duration && <span style={{ fontSize: 12, color: '#64748b' }}>⏱ Resolvido em: <b>{duration}</b></span>}
            </div>

            {/* Header clicável */}
            <div style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}
              onClick={() => setExpanded(isExp ? null : mo.id)}>

              <div style={{ flex: '1 1 100px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nº OS</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{mo.readable_id}</div>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CTO</div>
                <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>{mo.cto_number}</div>
              </div>
              <div style={{ flex: '2 1 160px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Problema</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{PROBLEM_LABELS[mo.problem_type] || mo.problem_type}</div>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Aberto por</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{mo.origin_tech_name || '—'}</div>
              </div>
              <div style={{ flex: '1 1 120px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Atribuído a</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>{mo.assigned_tech_name || 'Aguardando'}</div>
              </div>
              <div style={{ flex: '1 1 100px' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Abertura</div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>{fmtDateTime(mo.created_at)}</div>
              </div>
              <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{isExp ? '▲' : '▼'}</span>
            </div>

            {/* Expandido */}
            {isExp && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'var(--bg-main)' }}>
                {/* Timer */}
                {mo.started_at && mo.status !== 'concluido' && <OSTimer startedAt={mo.started_at} />}

                {/* Descrição */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Descrição</div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)' }}>{mo.description}</div>
                </div>

                {/* Mapa */}
                {mo.latitude_origin && (
                  <div style={{ marginBottom: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button onClick={() => openRoute(mo.latitude_origin, mo.longitude_origin)}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                      🗺️ Ver no Mapa
                    </button>
                    {mo.latitude_finish && (
                      <a href={`https://maps.google.com/?q=${mo.latitude_finish},${mo.longitude_finish}`} target="_blank" rel="noreferrer"
                        style={{ padding: '8px 16px', borderRadius: 10, background: '#dcfce7', color: '#16a34a', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                        📍 Local da Conclusão
                      </a>
                    )}
                  </div>
                )}

                {/* Fotos antes */}
                {photosBefore.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>🔴 Fotos do Problema</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {photosBefore.map((p, i) => <img key={i} src={p} alt="" onClick={() => setLightbox(p)} style={{ width: 90, height: 75, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #fecaca' }} />)}
                    </div>
                  </div>
                )}

                {/* Fotos depois */}
                {photosAfter.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>🟢 Fotos Após Normalização</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {photosAfter.map((p, i) => <img key={i} src={p} alt="" onClick={() => setLightbox(p)} style={{ width: 90, height: 75, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '2px solid #86efac' }} />)}
                    </div>
                  </div>
                )}

                {mo.tech_observations && (
                  <div style={{ marginBottom: 14, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#166534' }}>
                    ✅ {mo.tech_observations}
                  </div>
                )}

                {/* Ações manutenção */}
                {isMaintenance && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                    {mo.status === 'aguardando' && (
                      <button onClick={() => accept(mo.id)} disabled={actionLoading === mo.id + '_accept'}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        {actionLoading === mo.id + '_accept' ? '...' : '✅ Aceitar Ordem'}
                      </button>
                    )}
                    {mo.status === 'em_deslocamento' && isMine && (
                      <>
                        <button onClick={() => openRoute(mo.latitude_origin, mo.longitude_origin)}
                          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                          🚗 Iniciar Rota
                        </button>
                        <button onClick={() => updateStatus(mo.id, 'em_andamento')} disabled={!!actionLoading}
                          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                          🔧 Cheguei / Executar Serviço
                        </button>
                      </>
                    )}
                    {mo.status === 'em_andamento' && isMine && finishing !== mo.id && (
                      <button onClick={() => { setFinishing(mo.id); setFinishingId(mo.id); setFinishForm({ observations: '', photos: [], signal_after: '' }); }}
                        style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                        🟢 Marcar como Sinal Normalizado
                      </button>
                    )}
                  </div>
                )}

                {/* Formulário conclusão */}
                {finishing === mo.id && (
                  <div style={{ marginTop: 16, background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 800, color: '#166534', marginBottom: 12, fontSize: 15 }}>🟢 Registrar Normalização do Sinal</div>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handleFinishPhoto} style={{ display: 'none' }} />

                    {/* PowerMeter */}
                    <div style={{ marginBottom: 14, background: '#fff', border: '1.5px solid #7c3aed30', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: 13, marginBottom: 8 }}>📡 Leitura do PowerMeter (Sinal após correção)</div>
                      <input
                        type="number" step="0.1" placeholder="Ex: -18.0"
                        value={finishForm.signal_after}
                        onChange={e => setFinishForm(f => ({ ...f, signal_after: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${finishForm.signal_after ? '#86efac' : '#fca5a5'}`, fontSize: 14, boxSizing: 'border-box', background: '#f8fafc' }} />
                      {!finishForm.signal_after && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Leitura do sinal obrigatória (PowerMeter OK)</div>}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                        📷 Fotos após correção (com PowerMeter) <span style={{ color: '#dc2626' }}>*</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                        {finishForm.photos.map((p, i) => (
                          <div key={i} style={{ position: 'relative' }}>
                            <img src={p} alt="" style={{ width: 80, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid #86efac' }} />
                            <button onClick={() => setFinishForm(f => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }))}
                              style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}>×</button>
                          </div>
                        ))}
                        <button onClick={() => fileRef.current.click()}
                          style={{ width: 80, height: 70, border: '2px dashed #86efac', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#16a34a', fontSize: 11 }}>
                          <span style={{ fontSize: 20 }}>📷</span><span>Foto</span>
                        </button>
                      </div>
                      {finishForm.photos.length === 0 && <div style={{ fontSize: 12, color: '#dc2626' }}>Mínimo 1 foto obrigatória</div>}
                    </div>

                    <textarea value={finishForm.observations} onChange={e => setFinishForm(f => ({ ...f, observations: e.target.value }))}
                      placeholder="Ex: Fibra rompida corrigida, sinal restabelecido. PowerMeter mostrando -18dBm..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #86efac', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }} />

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => setFinishing(null)}
                        style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-muted)', fontWeight: 700, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                      <button
                        onClick={() => updateStatus(mo.id, 'concluido', { photos_after: JSON.stringify(finishForm.photos), tech_observations: finishForm.observations, signal_after: finishForm.signal_after })}
                        disabled={finishForm.photos.length === 0 || !finishForm.observations.trim() || !finishForm.signal_after || !!actionLoading}
                        style={{ flex: 2, padding: 10, borderRadius: 10, border: 'none', background: finishForm.photos.length && finishForm.observations && finishForm.signal_after ? '#16a34a' : '#e2e8f0', color: finishForm.photos.length && finishForm.observations && finishForm.signal_after ? '#fff' : '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
                        {actionLoading ? '...' : '🟢 Confirmar — Sinal Normalizado'}
                      </button>
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
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={lightbox} alt="" style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12 }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', fontSize: 24, borderRadius: '50%', width: 40, height: 40, cursor: 'pointer' }}>×</button>
          <a href={lightbox} download style={{ position: 'absolute', bottom: 24, background: '#7c3aed', color: '#fff', padding: '10px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>Baixar</a>
        </div>
      )}
    </div>
  );
}
