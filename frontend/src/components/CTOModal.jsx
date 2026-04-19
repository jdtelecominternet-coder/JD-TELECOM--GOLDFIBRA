import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { compressImage } from '../utils/imageUtils';

const PROBLEM_TYPES = [
  { value: 'sem_sinal', label: 'CTO sem sinal' },
  { value: 'sinal_alterado', label: 'CTO com sinal alterado' },
  { value: 'cto_quebrada', label: 'CTO quebrada' },
  { value: 'cto_caida', label: 'CTO caída' },
  { value: 'cabo_rompido', label: 'Cabeamento rompido próximo à CTO' },
];

export default function CTOModal({ os, onClose }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ problem_type: '', cto_number: '', observations: '' });
  const [photos, setPhotos] = useState([]);
  const [geo, setGeo] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('Não foi possível obter localização')
    );
  }, []);

  function handlePhoto(e) {
    const files = Array.from(e.target.files);
    files.forEach(async file => {
      const compressed = await compressImage(file);
      setPhotos(p => [...p, compressed]);
    });
  }

  function removePhoto(i) {
    setPhotos(p => p.filter((_, idx) => idx !== i));
  }

  const canSave = form.problem_type && form.cto_number.trim() && photos.length > 0 && geo;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post('/maintenance', {
        origin_os_id: os?.id || null,
        problem_type: form.problem_type,
        cto_number: form.cto_number.trim(),
        description: form.observations || form.problem_type,
        photos_before: JSON.stringify(photos),
        latitude_origin: geo?.lat || null,
        longitude_origin: geo?.lng || null,
      });
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const box = { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', padding: 0 };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>Registrar Ocorrência CTO</div>
            {os && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>OS: {os.readable_id || os.os_number}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Aviso */}
          <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#92400e' }}>
            ⚠️ Use este botão apenas quando identificar um <b>problema na CTO</b>. O registro será enviado automaticamente ao administrador.
          </div>

          {/* Tipo de problema */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 14 }}>
              Tipo de Problema <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROBLEM_TYPES.map(pt => (
                <label key={pt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${form.problem_type === pt.value ? '#dc2626' : '#e2e8f0'}`, background: form.problem_type === pt.value ? '#fef2f2' : '#f8fafc', cursor: 'pointer' }}>
                  <input type="radio" name="problem_type" value={pt.value} checked={form.problem_type === pt.value} onChange={e => setForm(f => ({ ...f, problem_type: e.target.value }))} style={{ accentColor: '#dc2626' }} />
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Número da CTO */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>
              Número da CTO <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input value={form.cto_number} onChange={e => setForm(f => ({ ...f, cto_number: e.target.value.toUpperCase() }))}
              placeholder="Ex: CTO-123 / CTO-45B"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box' }} />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>
              Fotos de Evidência <span style={{ color: '#ef4444' }}>*</span> <span style={{ fontWeight: 400, fontSize: 12, color: '#64748b' }}>(mín. 1, máx. 3)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhoto} style={{ display: 'none' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt={`foto ${i + 1}`} style={{ width: 80, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0' }} />
                  <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
              {photos.length < 3 && (
                <button onClick={() => fileRef.current.click()}
                  style={{ width: 80, height: 70, border: '2px dashed #94a3b8', borderRadius: 8, background: '#f8fafc', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#64748b', fontSize: 11 }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span>Foto</span>
                </button>
              )}
            </div>
            {photos.length === 0 && <div style={{ fontSize: 12, color: '#ef4444' }}>Pelo menos 1 foto é obrigatória</div>}
          </div>

          {/* Geolocalização */}
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: geo ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${geo ? '#86efac' : '#fecaca'}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: geo ? '#16a34a' : '#dc2626' }}>
              {geo ? '📍 Localização capturada automaticamente' : geoError ? `⚠️ ${geoError}` : '⏳ Obtendo localização...'}
            </div>
            {geo && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</div>}
            {!geo && !geoError && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Aguardando GPS...</div>
            )}
          </div>

          {/* Observação */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>Observação (opcional)</label>
            <textarea value={form.observations} onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              placeholder="Descreva o problema com mais detalhes..."
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#f8fafc', color: '#1e293b', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: canSave ? '#dc2626' : '#e2e8f0', color: canSave ? '#fff' : '#94a3b8', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', fontSize: 14 }}>
              {saving ? 'Salvando...' : 'Registrar Ocorrência'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
