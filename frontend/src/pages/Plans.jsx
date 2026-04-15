import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, X, Wifi, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Plans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    try { const r = await api.get('/plans'); setPlans(r.data); } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name || !form.speed || !form.price) return toast.error('Campos obrigatórios');
    setSaving(true);
    try {
      if (!form.id) { await api.post('/plans', form); toast.success('Plano criado!'); }
      else { await api.put(`/plans/${form.id}`, form); toast.success('Atualizado!'); }
      setModal(null); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Desativar plano?')) return;
    try { await api.delete(`/plans/${id}`); toast.success('Plano desativado'); load(); } catch { toast.error('Erro'); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Planos</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{plans.length} planos ativos</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => { setForm({}); setModal('form'); }} className="btn-primary">
            <Plus className="w-4 h-4" /> Novo Plano
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(p => (
            <div key={p.id} className="card transition-colors" style={{ border: '1px solid var(--border)' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}>
                  <Wifi className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                {user.role === 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => { setForm({...p}); setModal('form'); }}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-muted)' }}>
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => del(p.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: '#f87171' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
              <p className="font-black text-2xl mt-1" style={{ color: 'var(--accent)' }}>{p.speed}</p>
              <p className="text-sm flex items-center gap-1 mt-2" style={{ color: 'var(--text-secondary)' }}>
                <DollarSign className="w-3 h-3" />
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>R$ {Number(p.price).toFixed(2)}</span>/mês
              </p>
              {p.benefits && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.benefits}</p>
                </div>
              )}
            </div>
          ))}
          {plans.length === 0 && (
            <div className="sm:col-span-2 lg:col-span-3 text-center py-16" style={{ color: 'var(--text-muted)' }}>
              Nenhum plano cadastrado
            </div>
          )}
        </div>
      )}

      {modal === 'form' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6 max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Editar Plano' : 'Novo Plano'}</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div><label className="label">Nome do Plano *</label><input value={form.name||''} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className="input" placeholder="Ex: Fibra 300MB" /></div>
              <div><label className="label">Velocidade *</label><input value={form.speed||''} onChange={e=>setForm(p=>({...p,speed:e.target.value}))} className="input" placeholder="Ex: 300 Mbps" /></div>
              <div><label className="label">Valor Mensal (R$) *</label><input type="number" step="0.01" value={form.price||''} onChange={e=>setForm(p=>({...p,price:e.target.value}))} className="input" placeholder="0.00" /></div>
              <div><label className="label">Benefícios</label><textarea value={form.benefits||''} onChange={e=>setForm(p=>({...p,benefits:e.target.value}))} className="input h-20 resize-none" placeholder="Descreva os benefícios..." /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
