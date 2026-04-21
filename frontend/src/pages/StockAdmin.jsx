import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Package, Plus, Trash2, RefreshCw, User, Scan } from 'lucide-react';

export default function StockAdmin() {
  const [technicians, setTechnicians] = useState([]);
  const [selected, setSelected] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('disponivel');

  const [form, setForm] = useState({ mac_address: '', modelo: '', serial: '' });
  const [bulk, setBulk] = useState('');
  const [mode, setMode] = useState('single');
  const [saving, setSaving] = useState(false);

  // Leitor de código de barras via teclado (sufixo Enter)
  const scanBuffer = useRef('');
  const scanTimer = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      // Ignora se foco está em textarea/input de outra finalidade
      if (e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Enter') {
        const val = scanBuffer.current.trim();
        if (val.length >= 6) {
          // Detecta se é MAC (12 hex chars) ou Serial
          const isMac = /^[0-9A-Fa-f]{12}$/.test(val.replace(/[^0-9A-Fa-f]/g, ''));
          if (isMac) {
            setForm(f => ({ ...f, mac_address: val }));
            toast('📡 MAC detectado pelo leitor!', { icon: '✅', duration: 2000 });
          } else {
            setForm(f => ({ ...f, serial: val }));
            toast('📦 Serial detectado pelo leitor!', { icon: '✅', duration: 2000 });
          }
        }
        scanBuffer.current = '';
        clearTimeout(scanTimer.current);
      } else if (e.key.length === 1) {
        scanBuffer.current += e.key;
        clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => { scanBuffer.current = ''; }, 200);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    api.get('/users').then(r => {
      setTechnicians(r.data.filter(u => u.role === 'tecnico' && u.active !== 0));
    }).catch(() => toast.error('Erro ao carregar técnicos'));
  }, []);

  const loadStock = useCallback(async (techId) => {
    if (!techId) return;
    setLoading(true);
    try {
      const r = await api.get(`/stock?tech_id=${techId}`);
      setStock(r.data);
    } catch { toast.error('Erro ao carregar estoque'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (selected) loadStock(selected.id); }, [selected, loadStock]);

  async function handleSingle(e) {
    e.preventDefault();
    if (!selected) { toast.error('Selecione um técnico'); return; }
    if (!form.mac_address && !form.serial) { toast.error('Informe o MAC ou o Serial'); return; }
    setSaving(true);
    try {
      await api.post('/stock', { ...form, tech_id: selected.id });
      toast.success('ONU cadastrada no estoque!');
      setForm({ mac_address: '', modelo: '', serial: '' });
      loadStock(selected.id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao cadastrar'); }
    finally { setSaving(false); }
  }

  async function handleBulk(e) {
    e.preventDefault();
    if (!selected) { toast.error('Selecione um técnico'); return; }
    const lines = bulk.trim().split('\n').filter(Boolean);
    const items = lines.map(l => {
      const parts = l.split(/[,;\t]+/);
      return { mac_address: parts[0]?.trim() || '', modelo: parts[1]?.trim() || '', serial: parts[2]?.trim() || '' };
    }).filter(i => i.mac_address || i.serial);
    if (!items.length) { toast.error('Informe ao menos uma ONU'); return; }
    setSaving(true);
    try {
      const r = await api.post('/stock/bulk', { items, tech_id: selected.id });
      toast.success(`${r.data.ok?.length || 0} ONUs cadastradas!`);
      setBulk('');
      loadStock(selected.id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao cadastrar em lote'); }
    finally { setSaving(false); }
  }

  async function handleRemove(id) {
    if (!confirm('Remover esta ONU do estoque?')) return;
    try {
      await api.delete(`/stock/${id}`);
      toast.success('ONU removida');
      loadStock(selected.id);
    } catch (e) { toast.error(e.response?.data?.error || 'Erro ao remover'); }
  }

  const filtered = stock.filter(s => filter === 'todos' || s.status === filter);
  const counts = { disponivel: stock.filter(s => s.status === 'disponivel').length, utilizada: stock.filter(s => s.status === 'utilizada').length, todos: stock.length };
  const STATUS_COLOR = { disponivel: '#22c55e', utilizada: '#6366f1', defeito: '#ef4444' };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Estoque do Técnico</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cadastro e distribuição de ONUs — somente administrador</p>
      </div>

      {/* Selecionar técnico */}
      <div className="card p-4">
        <label className="label">Selecionar Técnico</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {technicians.map(t => (
            <button key={t.id} onClick={() => setSelected(t)}
              className="flex items-center gap-2 p-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: selected?.id === t.id ? 'var(--accent)' : 'var(--bg-input)',
                color: selected?.id === t.id ? '#fff' : 'var(--text-primary)',
                border: `2px solid ${selected?.id === t.id ? 'var(--accent)' : 'transparent'}`,
              }}>
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <>
          {/* Cadastrar ONU */}
          <div className="card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base flex-1" style={{ color: 'var(--text-primary)' }}>
                Cadastrar ONU → <span style={{ color: 'var(--accent)' }}>{selected.name}</span>
              </h2>
              <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: '#22c55e20', color: '#22c55e' }}>
                <Scan className="w-3 h-3" /> Leitor ativo
              </span>
            </div>

            <div className="rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
              💡 Use o leitor de código de barras — ele preenche automaticamente. Ou digite manualmente. <strong>Basta MAC ou Serial.</strong>
            </div>

            <div className="flex gap-2 mb-2">
              {[['single','Individual'],['bulk','Em Lote']].map(([v,l]) => (
                <button key={v} onClick={() => setMode(v)}
                  className="px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: mode === v ? 'var(--accent)' : 'var(--bg-input)', color: mode === v ? '#fff' : 'var(--text-muted)' }}>
                  {l}
                </button>
              ))}
            </div>

            {mode === 'single' ? (
              <form onSubmit={handleSingle} className="space-y-3">
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <label className="label" style={{ display: 'block', marginBottom: 4 }}>MAC Address</label>
                    <input value={form.mac_address}
                      onChange={e => setForm(f => ({ ...f, mac_address: e.target.value }))}
                      placeholder="AA:BB:CC:DD:EE:FF" className="input w-full" style={{ textAlign: 'center' }} />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label className="label" style={{ display: 'block', marginBottom: 4 }}>Modelo</label>
                    <input value={form.modelo}
                      onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                      placeholder="Ex: HG8310M" className="input w-full" style={{ textAlign: 'center' }} />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label className="label" style={{ display: 'block', marginBottom: 4 }}>Serial</label>
                    <input value={form.serial}
                      onChange={e => setForm(f => ({ ...f, serial: e.target.value }))}
                      placeholder="Serial da ONU" className="input w-full" style={{ textAlign: 'center' }} />
                  </div>
                </div>
                <button type="submit" disabled={saving || (!form.mac_address && !form.serial)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Salvar no Estoque
                </button>
              </form>
            ) : (
              <form onSubmit={handleBulk} className="space-y-3">
                <label className="label">Uma ONU por linha: MAC, Modelo, Serial (separados por vírgula)</label>
                <textarea value={bulk} onChange={e => setBulk(e.target.value)} rows={6}
                  className="input w-full font-mono text-sm"
                  placeholder={"AA:BB:CC:11:22:33, HG8310M, SN001\n, HG8245H, SN002\nCC:DD:EE:44:55:66"} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Deixe MAC vazio se só tiver serial: ex: <code>, modelo, SERIAL123</code></p>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'var(--accent)' }}>
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                  Cadastrar em Lote
                </button>
              </form>
            )}
          </div>

          {/* Estoque */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>Estoque de {selected.name}</h2>
              <button onClick={() => loadStock(selected.id)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg"
                style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              {[['disponivel','Disponível'],['utilizada','Utilizada'],['todos','Todos']].map(([v,l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: filter === v ? 'var(--accent)' : 'var(--bg-input)', color: filter === v ? '#fff' : 'var(--text-muted)' }}>
                  {l} ({counts[v]})
                </button>
              ))}
            </div>

            {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} /></div>}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-8">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma ONU cadastrada</p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: 480 }}>
                  <thead>
                    <tr>{['MAC','Modelo','Serial','Status','Ação'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--border)' }}>
                        <td className="table-cell font-mono text-xs">{s.mac_address || '—'}</td>
                        <td className="table-cell">{s.modelo || '—'}</td>
                        <td className="table-cell font-mono text-xs">{s.serial || '—'}</td>
                        <td className="table-cell">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: (STATUS_COLOR[s.status] || '#888') + '20', color: STATUS_COLOR[s.status] || '#888' }}>
                            {s.status === 'disponivel' ? 'Disponível' : s.status === 'utilizada' ? 'Utilizada' : s.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          {s.status === 'disponivel' ? (
                            <button onClick={() => handleRemove(s.id)} className="p-1.5 rounded-lg hover:bg-red-500/20" style={{ color: '#ef4444' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.client_name || 'Em uso'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
