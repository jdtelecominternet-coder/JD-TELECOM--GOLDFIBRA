import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Settings, DollarSign, Percent, Wrench, Award, Save, Upload, Shield, RefreshCw, Banknote } from 'lucide-react';

const TIPO_OS_OPTS = [
  'Adesão / Ativação',
  'Mudança de Endereço',
  'Troca de Equipamento',
  'Retirada de Equipamento',
  'Troca de Drop (Rompimento)',
];

const DEFAULT_PERMS = {
  vendedor: { dashboard: true, clients: true, plans: true, orders: true, transfer: true, technical: false, reports: false, chat: false },
  tecnico:  { dashboard: true, clients: false, plans: false, orders: false, technical: true, reports: false, chat: true },
};
const PERM_LABELS = {
  dashboard: 'Dashboard', clients: 'Clientes', plans: 'Planos', orders: 'Ordens de Servico',
  transfer: 'Transferencias', technical: 'Modulo Tecnico', reports: 'Relatorios', chat: 'Chat',
};

export default function SettingsPage() {
  const [commType, setCommType] = useState('percent');
  const [commValue, setCommValue] = useState(10);
  const [techValue, setTechValue] = useState(50);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [perms, setPerms] = useState(DEFAULT_PERMS);
  const [savingPerms, setSavingPerms] = useState(false);
  const [valoresTipo, setValoresTipo] = useState({});
  const [savingValores, setSavingValores] = useState(false);
  const [tiposOs, setTiposOs] = useState([]);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/settings').then(r => {
      setCommType(r.data.seller_commission_type || 'percent');
      setCommValue(r.data.seller_commission_value ?? 10);
      setTechValue(r.data.tech_commission_value ?? 50);
      setLogoUrl(r.data.logo_url);
    }).catch(() => {});
    api.get('/settings/role-permissions').then(r => {
      setPerms({ vendedor: { ...DEFAULT_PERMS.vendedor, ...(r.data.vendedor||{}) }, tecnico: { ...DEFAULT_PERMS.tecnico, ...(r.data.tecnico||{}) } });
    }).catch(() => {});
    api.get('/tipos-os').then(r => {
      setTiposOs(r.data);
      const map = {};
      r.data.forEach(t => { map[t.id] = t.valor_padrao; });
      setValoresTipo(map);
    }).catch(() => {});
  }, []);

  async function saveComm() {
    setSaving(true);
    try {
      await api.put('/settings/commissions', {
        seller_commission_type: commType,
        seller_commission_value: Number(commValue),
        tech_commission_value: Number(techValue),
      });
      toast.success('Valores de comissao salvos!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function uploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      const r = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setLogoUrl(r.data.logo_url);
      toast.success('Logo atualizado!');
    } catch { toast.error('Erro ao enviar logo'); }
    finally { setUploading(false); }
  }

  async function savePerms(role) {
    setSavingPerms(role);
    try {
      await api.put('/settings/role-permissions', { role, permissions: perms[role] });
      toast.success(`Permissoes do ${role} salvas!`);
    } catch { toast.error('Erro ao salvar'); }
    finally { setSavingPerms(false); }
  }

  async function saveValores() {
    setSavingValores(true);
    try {
      await Promise.all(
        Object.entries(valoresTipo).map(([id, valor]) =>
          api.put(`/tipos-os/${id}`, { valor_padrao: Number(valor) })
        )
      );
      toast.success('Valores padrão salvos!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSavingValores(false); }
  }

  const fmtPreview = () => {
    if (commType === 'percent') return `${commValue}% sobre o valor do plano vendido`;
    return `R$ ${Number(commValue).toFixed(2)} por venda concluida`;
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Settings className="w-6 h-6" style={{ color: 'var(--accent)' }} /> Configuracoes
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Gerencie comissoes, logo e permissoes do sistema</p>
      </div>

      {/* LOGO */}
      <div className="card">
        <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Upload className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Logo da Empresa
        </h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              : <Upload className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <div>
            <button onClick={() => fileRef.current.click()} disabled={uploading} className="btn-primary">
              {uploading ? 'Enviando...' : 'Alterar Logo'}
            </button>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>PNG, JPG ou SVG. Max 5MB.</p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadLogo} />
          </div>
        </div>
      </div>

      {/* COMISSAO VENDEDOR */}
      <div className="card">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Award className="w-4 h-4" style={{ color: '#f59e0b' }} /> Comissao dos Vendedores
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Define quanto cada vendedor ganha por venda concluida (OS finalizada)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Tipo de Comissao</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCommType('percent')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all text-sm ${commType === 'percent' ? 'border-yellow-400' : 'border-transparent'}`}
                style={{ background: commType === 'percent' ? '#f59e0b22' : 'var(--bg-input)', color: commType === 'percent' ? '#f59e0b' : 'var(--text-secondary)' }}>
                <Percent className="w-4 h-4" /> Percentual
              </button>
              <button onClick={() => setCommType('fixed')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold transition-all text-sm ${commType === 'fixed' ? 'border-yellow-400' : 'border-transparent'}`}
                style={{ background: commType === 'fixed' ? '#f59e0b22' : 'var(--bg-input)', color: commType === 'fixed' ? '#f59e0b' : 'var(--text-secondary)' }}>
                <DollarSign className="w-4 h-4" /> Valor Fixo
              </button>
            </div>
          </div>
          <div>
            <label className="label">{commType === 'percent' ? 'Percentual (%)' : 'Valor por Venda (R$)'}</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                {commType === 'percent' ? '%' : 'R$'}
              </span>
              <input type="number" min="0" step={commType === 'percent' ? '1' : '0.01'}
                value={commValue} onChange={e => setCommValue(e.target.value)}
                className="input pl-9" placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: '#f59e0b15', border: '1px solid #f59e0b44' }}>
          <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Previa: {fmtPreview()}</p>
        </div>
      </div>

      {/* VALOR TECNICO */}
      <div className="card">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Wrench className="w-4 h-4" style={{ color: '#22c55e' }} /> Valor por Instalacao - Tecnicos
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Valor fixo pago ao tecnico por cada OS finalizada</p>

        <div className="max-w-xs">
          <label className="label">Valor por Instalacao (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>R$</span>
            <input type="number" min="0" step="0.01"
              value={techValue} onChange={e => setTechValue(e.target.value)}
              className="input pl-9" placeholder="0.00" />
          </div>
        </div>

        <div className="rounded-xl p-3 mt-4" style={{ background: '#22c55e15', border: '1px solid #22c55e44' }}>
          <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
            Previa: R$ {Number(techValue).toFixed(2)} por instalacao concluida
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={saveComm} disabled={saving} className="btn-primary gap-2 px-8">
          <Save className="w-4 h-4" />
          {saving ? 'Salvando...' : 'Salvar Valores de Comissao'}
        </button>
      </div>

      {/* PERMISSOES */}
      <div className="card">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Shield className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Permissoes por Funcao
        </h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Controle quais menus cada funcao pode acessar</p>

        {['vendedor', 'tecnico'].map(role => (
          <div key={role} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                {role === 'vendedor' ? 'Vendedor' : 'Tecnico'}
              </h3>
              <button onClick={() => savePerms(role)} disabled={savingPerms === role} className="btn-primary py-1.5 px-3 text-xs gap-1">
                <Save className="w-3 h-3" />
                {savingPerms === role ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.keys(DEFAULT_PERMS[role]).map(perm => (
                <label key={perm} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                  <input type="checkbox" checked={perms[role]?.[perm] ?? DEFAULT_PERMS[role][perm]}
                    onChange={e => setPerms(p => ({ ...p, [role]: { ...p[role], [perm]: e.target.checked } }))}
                    className="rounded" />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{PERM_LABELS[perm]}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* VALORES PADRÃO POR TIPO DE OS */}
      <div className="card">
        <h2 className="text-base font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Banknote className="w-4 h-4" style={{ color: '#10b981' }} /> Valores Padrão por Tipo de OS
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Ao criar uma OS, o valor do serviço é preenchido automaticamente com base no tipo selecionado.
        </p>
        <div className="space-y-3 mb-4">
          {tiposOs.map(tipo => (
            <div key={tipo.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <span className="flex-1 text-sm font-medium" style={{ color: '#818cf8' }}>{tipo.nome}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>R$</span>
                <input
                  type="number" min="0" step="0.01"
                  value={valoresTipo[tipo.id] ?? tipo.valor_padrao}
                  onChange={e => setValoresTipo(p => ({ ...p, [tipo.id]: e.target.value }))}
                  className="input w-28 text-right font-bold"
                  style={{ color: '#10b981' }}
                />
              </div>
            </div>
          ))}
        </div>
        <button onClick={saveValores} disabled={savingValores} className="btn-primary gap-2">
          <Save className="w-4 h-4" />
          {savingValores ? 'Salvando...' : 'Salvar Valores'}
        </button>
      </div>
    </div>
  );
}