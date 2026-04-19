import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { compressImage } from '../utils/imageUtils';
import { useAutoSave } from '../utils/useAutoSave';

const PROBLEM_TYPES = [
  { value: 'sem_sinal', label: 'CTO sem sinal' },
  { value: 'sinal_alterado', label: 'CTO com sinal alterado' },
  { value: 'cto_quebrada', label: 'CTO quebrada' },
  { value: 'cto_caida', label: 'CTO caída' },
  { value: 'cabo_rompido', label: 'Cabeamento rompido próximo à CTO' },
  { value: 'outro', label: 'Outro' },
];

export default function MaintenanceModal({ os, onClose }) {
  const osKey = 'maint_modal_' + (os?.id || 'new');
  const [form, setForm, clearForm] = useAutoSave(osKey + '_form', { problem_type: '', cto_number: '', description: '' });
  const [photos, setPhotos, clearPhotos] = useAutoSave(osKey + '_photos', []);
  const [geo, setGeo] = useState(null);
  const [geoError, setGeoError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      pos => setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError('GPS não disponível')
    );
  }, []);

  function handlePhoto(e) {
    const files = Array.from(e.target.files);
    files.forEach(async file => {
      const compressed = await compressImage(file, 1200, 0.75);
      if (!compressed) return;
      setPhotos(p => [...p, compressed]);
    });
  }

  const canSave = form.problem_type && form.cto_number.trim() && form.description.trim() && photos.length > 0;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.post('/maintenance', {
        origin_os_id: os?.id || null,
        problem_type: form.problem_type,
        cto_number: form.cto_number.trim(),
        description: form.description.trim(),
        photos_before: JSON.stringify(photos),
        latitude_origin: geo?.lat || null,
        longitude_origin: geo?.lng || null,
      });
      alert('Ordem de manutenção enviada! O time de rede foi notificado.');
      clearForm();
      clearPhotos();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar ordem');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', padding: '16px 20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>🔧 Nova OS de Rede</div>
            {os && <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>OS origem: {os.readable_id || os.os_number}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: 32, height: 32, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ background: '#f3e8ff', border: '1.5px solid #c084fc', borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13, color: '#581c87' }}>
            🔔 Uma <b>OS de Rede</b> será criada automaticamente e enviada ao técnico de rede disponível.
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 14 }}>Tipo de Problema <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PROBLEM_TYPES.map(pt => (
                <label key={pt.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px solid ${form.problem_type === pt.value ? '#7c3aed' : '#e2e8f0'}`, background: form.problem_type === pt.value ? '#f3e8ff' : '#f8fafc', cursor: 'pointer' }}>
                  <input type="radio" name="problem_type" value={pt.value} checked={form.problem_type === pt.value} onChange={e => setForm(f => ({ ...f, problem_type: e.target.value }))} style={{ accentColor: '#7c3aed' }} />
                  <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>{pt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* CTO */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>Número da CTO <span style={{ color: '#ef4444' }}>*</span></label>
            <input value={form.cto_number} onChange={e => setForm(f => ({ ...f, cto_number: e.target.value.toUpperCase() }))}
              placeholder="Ex: CTO-123"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f8fafc', color: '#1e293b', boxSizing: 'border-box' }} />
          </div>

          {/* Descrição */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>Descrição do Problema <span style={{ color: '#ef4444' }}>*</span></label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Ex: Cliente sem sinal, CTO não está passando potência..."
              rows={3}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#f8fafc', color: '#1e293b', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#1e293b', marginBottom: 6, fontSize: 14 }}>Fotos de Evidência <span style={{ color: '#ef4444' }}>*</span></label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple onChange={handlePhoto} style={{ display: 'none' }} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={p} alt="" style={{ width: 80, height: 70, objectFit: 'cover', borderRadius: 8, border: '2px solid #e2e8f0' }} />
                  <button onClick={() => setPhotos(ps => ps.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              {photos.length < 5 && (
                <button onClick={() => fileRef.current.click()} style={{ width: 80, height: 70, border: '2px dashed #c084fc', borderRadius: 8, background: '#faf5ff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#7c3aed', fontSize: 11 }}>
                  <span style={{ fontSize: 22 }}>📷</span><span>Foto</span>
                </button>
              )}
            </div>
            {photos.length === 0 && <div style={{ fontSize: 12, color: '#ef4444' }}>Mínimo 1 foto obrigatória</div>}
          </div>

          {/* GPS */}
          <div style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 10, background: geo ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${geo ? '#86efac' : '#fecaca'}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: geo ? '#16a34a' : '#dc2626' }}>
              {geo ? '📍 Localização capturada' : geoError || '⏳ Obtendo GPS...'}
            </div>
            {geo && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{geo.lat.toFixed(6)}, {geo.lng.toFixed(6)}</div>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={!canSave || saving}
              style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: canSave ? '#7c3aed' : '#e2e8f0', color: canSave ? '#fff' : '#94a3b8', fontWeight: 700, cursor: canSave ? 'pointer' : 'not-allowed', fontSize: 14 }}>
              {saving ? 'Enviando...' : 'Enviar para Manutenção'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
