import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Camera, Search, RefreshCw, AlertTriangle, X, Plus } from 'lucide-react';

// ─── Leitura de código de barras ─────────────────────────────────────────────
function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);

      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'data_matrix'] });
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const value = barcodes[0].rawValue;
              clearInterval(intervalRef.current);
              stopCamera();
              onDetect(value);
            }
          } catch (_) {}
        }, 300);
      }
    } catch (e) {
      setError('Câmera não disponível. Use o campo manual abaixo.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); }
    setScanning(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#1e293b', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>📷 Escanear Código de Barras</span>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 22 }}><X /></button>
        </div>

        {/* Preview câmera */}
        <div style={{ position: 'relative', background: '#000', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: scanning ? 'block' : 'none' }} />
          {scanning && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: '65%', height: '35%', border: '2px solid #22c55e', borderRadius: 8, boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
              <div style={{ position: 'absolute', bottom: 12, width: '100%', textAlign: 'center', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>
                {('BarcodeDetector' in window) ? 'Aponte para o código de barras' : 'API de leitura não disponível. Use o campo manual.'}
              </div>
            </div>
          )}
          {error && <div style={{ color: '#f87171', fontSize: 13, padding: 16, textAlign: 'center' }}>{error}</div>}
        </div>

        {/* Input manual */}
        <div style={{ padding: 16 }}>
          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8 }}>Ou digite o MAC / código manualmente:</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={manual}
              onChange={e => setManual(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && manual.trim()) { stopCamera(); onDetect(manual.trim()); } }}
              placeholder="Ex: AA:BB:CC:DD:EE:FF"
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#fff', fontSize: 14 }}
              autoFocus={!!error}
            />
            <button
              onClick={() => { if (manual.trim()) { stopCamera(); onDetect(manual.trim()); } }}
              style={{ padding: '10px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Aba Principal: Estoque do Técnico ────────────────────────────────────────
export default function TechStock() {
  const [stock, setStock] = useState([]);
  const [summary, setSummary] = useState({ disponivel: 0, utilizado: 0, defeito: 0, total: 0 });
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('estoque');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [addForm, setAddForm] = useState({ mac_address: '', modelo: '', serial: '', obs: '', status: 'defeito' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get('/stock/my');
      setStock(r.data.items);
      setSummary(r.data.summary);
    } catch { toast.error('Erro ao carregar estoque'); }
    finally { setLoading(false); }
  }, []);

  const loadLog = useCallback(async () => {
    try {
      const r = await api.get('/stock/log');
      setLog(r.data);
    } catch {}
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!addForm.mac_address.trim() && !addForm.serial.trim()) return toast.error('Informe o MAC ou Serial');
    setSaving(true);
    try {
      await api.post('/stock', addForm);
      toast.success(`ONU registrada como ${addForm.status === 'defeito' ? 'Defeito' : 'Retirada'}!`);
      setAddForm({ mac_address: '', modelo: '', serial: '', obs: '', status: 'defeito' });
      setShowAdd(false);
      load(); loadLog();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar ONU');
    } finally { setSaving(false); }
  }

  function onScanDetect(value) {
    setShowScanner(false);
    setAddForm(f => ({ ...f, mac_address: value }));
    setShowAdd(true);
  }

  useEffect(() => { load(); loadLog(); }, []);

  async function markDefeito(item) {
    try {
      await api.put(`/stock/${item.id}`, { status: 'defeito', obs: 'Marcado como defeito pelo técnico' });
      toast.success('ONU marcada como defeito');
      load(); loadLog();
    } catch { toast.error('Erro ao atualizar'); }
  }

  const filtered = filterStatus ? stock.filter(i => i.status === filterStatus) : stock;

  const statusBadge = (s) => {
    if (s === 'disponivel') return { label: 'Disponível', bg: '#dcfce7', color: '#166534' };
    if (s === 'utilizado')  return { label: 'Em Uso',    bg: '#e0e7ff', color: '#3730a3' };
    if (s === 'defeito')    return { label: 'Defeito',   bg: '#fee2e2', color: '#991b1b' };
    return { label: s, bg: '#f1f5f9', color: '#475569' };
  };

  const actionLabel = { entrada: '➕ Entrada', saida: '📤 Instalada', transferencia: '🔄 Transferência', defeito: '⚠️ Defeito' };

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Carregando estoque...</div>;

  return (
    <div style={{ padding: '0 0 80px' }}>

      {/* ── Resumo ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Disponíveis', value: summary.disponivel, bg: '#dcfce7', color: '#166534', icon: '📦' },
          { label: 'Instaladas',  value: summary.utilizado,  bg: '#e0e7ff', color: '#3730a3', icon: '✅' },
          { label: 'Defeito',     value: summary.defeito,    bg: '#fee2e2', color: '#991b1b', icon: '⚠️' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: 24 }}>{c.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Botões de ação ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setShowScanner(true)} style={btnStyle('#7c3aed')}>
          <Camera size={15} /> Escanear MAC
        </button>
        <button onClick={() => setShowAdd(a => !a)} style={btnStyle('#dc2626')}>
          <Plus size={15} /> Registrar ONU
        </button>
        <button onClick={() => { load(); loadLog(); }} style={btnStyle('#475569')}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* ── Formulário: registrar ONU com defeito/retirada ── */}
      {showAdd && (
        <form onSubmit={handleAdd} style={{ ...cardStyle, marginBottom: 14, border: '1.5px solid #fca5a5' }}>
          <div style={{ fontWeight: 800, color: '#991b1b', marginBottom: 12, fontSize: 14 }}>
            ⚠️ Registrar ONU — Defeito ou Retirada
          </div>

          {/* Tipo: Defeito ou Retirado */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {[['defeito', '⚠️ Defeito', '#fee2e2', '#991b1b'], ['retirado', '🔄 Retirada', '#fef9c3', '#854d0e']].map(([v, l, bg, color]) => (
              <button key={v} type="button" onClick={() => setAddForm(f => ({ ...f, status: v }))}
                style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `2px solid ${addForm.status === v ? color : '#e2e8f0'}`,
                  background: addForm.status === v ? bg : '#f8fafc', color: addForm.status === v ? color : '#64748b',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 10 }}>
            {/* MAC com botão scanner */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input value={addForm.mac_address} onChange={e => setAddForm(f => ({ ...f, mac_address: e.target.value }))}
                placeholder="MAC Address (ex: AA:BB:CC:DD:EE:FF)" style={inputStyle} />
              <button type="button" onClick={() => setShowScanner(true)}
                style={{ ...btnStyle('#7c3aed'), padding: '10px 12px', flexShrink: 0 }}>
                <Camera size={16} />
              </button>
            </div>
            <input value={addForm.modelo} onChange={e => setAddForm(f => ({ ...f, modelo: e.target.value }))}
              placeholder="Modelo (ex: ZTE F601, Huawei HG8010H)" style={inputStyle} />
            <input value={addForm.serial} onChange={e => setAddForm(f => ({ ...f, serial: e.target.value }))}
              placeholder="Serial / Código de barras" style={inputStyle} />
            <textarea value={addForm.obs} onChange={e => setAddForm(f => ({ ...f, obs: e.target.value }))}
              placeholder={addForm.status === 'defeito' ? 'Descreva o defeito encontrado...' : 'Motivo da retirada...'}
              rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ ...btnStyle(addForm.status === 'defeito' ? '#dc2626' : '#d97706'), flex: 1 }}>
                {saving ? 'Salvando...' : `✅ Registrar como ${addForm.status === 'defeito' ? 'Defeito' : 'Retirada'}`}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ ...btnStyle('#64748b'), flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ── Abas: Estoque / Histórico ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: '#f1f5f9', borderRadius: 10, padding: 3 }}>
        {[['estoque', '📦 Estoque'], ['historico', '📋 Histórico']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{
            flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: tab === v ? '#fff' : 'transparent', color: tab === v ? '#1e293b' : '#64748b',
            boxShadow: tab === v ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {tab === 'estoque' && (
        <>
          {/* Filtro */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {[['', 'Todos'], ['disponivel', 'Disponíveis'], ['utilizado', 'Em Uso'], ['defeito', 'Defeito']].map(([v, l]) => (
              <button key={v} onClick={() => setFilterStatus(v)} style={{
                padding: '6px 14px', borderRadius: 20, border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer',
                background: filterStatus === v ? '#1e293b' : '#e2e8f0', color: filterStatus === v ? '#fff' : '#475569',
              }}>{l}</button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <Package size={40} style={{ margin: '0 auto 12px', opacity: .3 }} />
              <p>Nenhuma ONU no estoque</p>
            </div>
          )}

          {filtered.map(item => {
            const b = statusBadge(item.status);
            return (
              <div key={item.id} style={{ ...cardStyle, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{item.mac_address}</div>
                    {item.modelo && <div style={{ fontSize: 13, color: '#475569' }}>📡 {item.modelo}</div>}
                    {item.serial && <div style={{ fontSize: 12, color: '#94a3b8' }}>S/N: {item.serial}</div>}
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                      Entrada: {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    {item.client_name && <div style={{ fontSize: 12, color: '#3730a3', marginTop: 4 }}>👤 Cliente: {item.client_name}</div>}
                    {item.used_at && <div style={{ fontSize: 11, color: '#94a3b8' }}>Instalada: {new Date(item.used_at).toLocaleDateString('pt-BR')}</div>}
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.bg, color: b.color, flexShrink: 0 }}>
                    {b.label}
                  </span>
                </div>
                {item.obs && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, fontStyle: 'italic' }}>{item.obs}</div>}
                {item.status === 'disponivel' && (
                  <button onClick={() => markDefeito(item)} style={{ ...btnStyle('#dc2626'), marginTop: 10, fontSize: 12, padding: '7px 12px' }}>
                    <AlertTriangle size={13} /> Marcar Defeito
                  </button>
                )}
              </div>
            );
          })}
        </>
      )}

      {tab === 'historico' && (
        <>
          {log.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Nenhuma movimentação registrada</div>}
          {log.map(l => (
            <div key={l.id} style={{ ...cardStyle, marginBottom: 8, padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{actionLabel[l.action] || l.action}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(l.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{l.mac_address}</div>
              {l.modelo && <div style={{ fontSize: 12, color: '#94a3b8' }}>{l.modelo}</div>}
              {l.client_name && <div style={{ fontSize: 12, color: '#3730a3' }}>👤 {l.client_name}</div>}
              {l.obs && <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>{l.obs}</div>}
            </div>
          ))}
        </>
      )}

      {showScanner && <BarcodeScanner onDetect={onScanDetect} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

// ── Componente inline: Instalar ONU dentro de uma OS ─────────────────────────
export function InstalarONU({ os, onInstalled }) {
  const [showScanner, setShowScanner] = useState(false);
  const [mac, setMac] = useState('');
  const [checking, setChecking] = useState(false);
  const [found, setFound] = useState(null); // null | {found, mac_address, modelo, ...}
  const [installing, setInstalling] = useState(false);

  async function checkMac(value) {
    const clean = value.trim();
    if (!clean) return;
    setMac(clean);
    setChecking(true);
    try {
      const r = await api.get(`/stock/check/${encodeURIComponent(clean)}`);
      setFound(r.data);
      if (!r.data.found) toast.error(`ONU não encontrada no seu estoque`);
    } catch { setFound({ found: false }); }
    finally { setChecking(false); }
  }

  async function handleInstall() {
    if (!found?.found || !found?.status === 'disponivel') return;
    setInstalling(true);
    try {
      await api.post('/stock/use', { mac_address: mac, os_id: os.id, client_id: os.client_id });
      toast.success(`ONU ${mac} instalada e vinculada ao cliente!`);
      setMac(''); setFound(null);
      if (onInstalled) onInstalled(mac);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao instalar ONU');
    } finally { setInstalling(false); }
  }

  return (
    <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: 14, marginTop: 14 }}>
      <div style={{ fontWeight: 800, color: '#166534', fontSize: 14, marginBottom: 10 }}>📡 Instalar ONU / Modem</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input value={mac} onChange={e => setMac(e.target.value)} onBlur={e => e.target.value && checkMac(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && checkMac(mac)}
          placeholder="MAC Address da ONU" style={{ ...inputStyle, flex: 1 }} />
        <button type="button" onClick={() => setShowScanner(true)} style={{ ...btnStyle('#7c3aed'), padding: '10px 12px', flexShrink: 0 }}>
          <Camera size={16} />
        </button>
        <button type="button" onClick={() => checkMac(mac)} disabled={checking} style={{ ...btnStyle('#0f766e'), padding: '10px 12px', flexShrink: 0 }}>
          <Search size={16} />
        </button>
      </div>

      {checking && <p style={{ fontSize: 12, color: '#64748b' }}>Verificando estoque...</p>}

      {found && found.found && (
        <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, border: '1.5px solid #86efac' }}>
          <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#166534' }}>{found.mac_address}</div>
              {found.modelo && <div style={{ fontSize: 13, color: '#475569' }}>📡 {found.modelo}</div>}
              {found.serial && <div style={{ fontSize: 12, color: '#94a3b8' }}>S/N: {found.serial}</div>}
            </div>
            <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: found.status === 'disponivel' ? '#dcfce7' : '#fee2e2',
              color: found.status === 'disponivel' ? '#166534' : '#991b1b' }}>
              {found.status === 'disponivel' ? '✅ Disponível' : '❌ ' + found.status}
            </span>
          </div>
          {found.status === 'disponivel' && (
            <button onClick={handleInstall} disabled={installing} style={{ ...btnStyle('#16a34a'), marginTop: 10, width: '100%' }}>
              {installing ? 'Instalando...' : '✅ Confirmar Instalação — Baixar do Estoque'}
            </button>
          )}
          {found.status !== 'disponivel' && (
            <p style={{ color: '#dc2626', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
              ⚠️ Esta ONU não está disponível para instalação.
            </p>
          )}
        </div>
      )}

      {found && !found.found && (
        <div style={{ background: '#fff1f2', borderRadius: 10, padding: 10, fontSize: 13, color: '#be123c', fontWeight: 600 }}>
          ❌ ONU não encontrada no seu estoque. Verifique o MAC ou cadastre o equipamento.
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onDetect={(v) => { setShowScanner(false); checkMac(v); }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

// Estilos compartilhados
const btnStyle = (bg) => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '10px 16px', borderRadius: 10, border: 'none',
  background: bg, color: '#fff', fontWeight: 700, fontSize: 13,
  cursor: 'pointer',
});
const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 14, boxSizing: 'border-box',
  background: '#f8fafc', color: '#1e293b',
};
const cardStyle = {
  background: '#fff', borderRadius: 14, padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9',
};
