import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FileBarChart, Download, Filter, Upload, Settings, DollarSign } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const REPORT_TYPES = [
  { id: 'sales',         label: 'Vendas por Vendedor' },
  { id: 'installations', label: 'Instalações Realizadas' },
  { id: 'materials',     label: 'Materiais por Técnico' },
  { id: 'commissions',   label: 'Comissões e Ganhos' },
];

const STATUS_LABEL = { pendente:'Pendente', ativo:'Ativo', cancelado:'Cancelado', finalizado:'Finalizado', em_deslocamento:'Deslocamento', em_execucao:'Em Execução' };

export default function Reports() {
  const [type, setType]       = useState('sales');
  const [sellers, setSellers] = useState([]);
  const [techs, setTechs]     = useState([]);
  const [filters, setFilters] = useState({ seller_id: '', tech_id: '', from: '', to: '' });
  const [data, setData]       = useState([]);
  const [commCfg, setCommCfg] = useState(null);
  const [logo, setLogo]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingComm, setSavingComm] = useState(false);
  const [commForm, setCommForm] = useState({ seller_commission_type: 'percent', seller_commission_value: 10, tech_commission_value: 50 });

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/settings')]).then(([ur, sr]) => {
      setSellers(ur.data.filter(u => u.role === 'vendedor'));
      setTechs(ur.data.filter(u => u.role === 'tecnico'));
      setLogo(sr.data.logo_url);
      const cfg = sr.data;
      setCommCfg(cfg);
      setCommForm({
        seller_commission_type: cfg.seller_commission_type || 'percent',
        seller_commission_value: cfg.seller_commission_value ?? 10,
        tech_commission_value: cfg.tech_commission_value ?? 50,
      });
    }).catch(() => {});
  }, []);

  async function fetchReport() {
    setLoading(true);
    setData([]);
    setGenerated(false);
    try {
      if (type === 'commissions') {
        const sr = await api.get('/settings/dashboard');
        const d = sr.data;
        setData({ sellers: d.seller_stats || [], techs: d.tech_stats || [], cfg: d.commission_config });
        setGenerated(true);
        setLoading(false);
        return;
      }
      const params = new URLSearchParams();
      if (type === 'sales' && filters.seller_id) params.append('seller_id', filters.seller_id);
      if (type !== 'sales' && filters.tech_id) params.append('tech_id', filters.tech_id);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);
      const r = await api.get(`/reports/${type}?${params}`);
      setData(r.data);
      setGenerated(true);
    } catch (err) { toast.error('Erro ao gerar relatório: ' + (err?.response?.data?.error || err?.message || 'Tente novamente')); }
    finally { setLoading(false); }
  }

  async function saveCommissions() {
    setSavingComm(true);
    try {
      await api.put('/settings/commissions', commForm);
      toast.success('Comissões atualizadas!');
      setCommCfg({ ...commCfg, ...commForm });
    } catch { toast.error('Erro'); }
    finally { setSavingComm(false); }
  }

  async function uploadLogo(e) {
    const file = e.target.files[0]; if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData(); fd.append('logo', file);
    try { const r = await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); setLogo(r.data.logo_url); toast.success('Logotipo atualizado!'); }
    catch { toast.error('Erro'); } finally { setUploadingLogo(false); }
  }

  function generatePDF() {
    if (!data || (Array.isArray(data) && data.length === 0)) return toast.error('Nenhum dado para exportar');
    const doc = new jsPDF();
    const now = new Date().toLocaleString('pt-BR');

    // Header blue
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text('SysFlowCloudi', 14, 14);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Relatório: ${REPORT_TYPES.find(r => r.id === type)?.label}`, 14, 24);
    doc.text(`Gerado em: ${now}`, 14, 31);

    let columns = [], rows = [], startY = 45;

    if (type === 'sales') {
      columns = ['Cliente','Vendedor','Plano','Velocidade','Valor','Tipo de OS','Status','Data'];
      const commType = commCfg?.seller_commission_type;
      const commVal  = commCfg?.seller_commission_value ?? 0;
      rows = (Array.isArray(data) ? data : []).map(r => [
        r.client_name, r.seller_name, r.plan_name, r.speed,
        `R$ ${Number(r.price).toFixed(2)}`,
        r.tipo_ordem_servico || '—',
        STATUS_LABEL[r.client_status] || r.client_status,
        new Date(r.created_at).toLocaleDateString('pt-BR')
      ]);
      // Summary
      const total = (Array.isArray(data) ? data : []).reduce((s, r) => s + Number(r.price), 0);
      const comm  = commType === 'percent' ? total * commVal / 100 : (Array.isArray(data) ? data : []).length * commVal;
      doc.setTextColor(30, 58, 95); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
      doc.text(`Total de Vendas: ${(Array.isArray(data) ? data : []).length} | Receita: R$ ${total.toFixed(2)} | Comissão Estimada: R$ ${comm.toFixed(2)}`, 14, startY - 2);
      startY += 3;
    } else if (type === 'installations') {
      columns = ['OS','Cliente','Técnico','Plano','Tipo de OS','Status','DROP(m)','Finalizado'];
      rows = (Array.isArray(data) ? data : []).map(r => [
        r.os_number, r.client_name, r.tech_name||'—', r.plan_name,
        r.tipo_ordem_servico || '—',
        STATUS_LABEL[r.status]||r.status,
        r.drop_total ? `${r.drop_total}` : '—',
        r.finished_at ? new Date(r.finished_at).toLocaleDateString('pt-BR') : '—'
      ]);
    } else if (type === 'materials') {
      columns = ['Técnico','ID','OS Feitas','DROP(m)','Bucha','Esticador','Conector','Fixa-cabo'];
      const techVal = commCfg?.tech_commission_value ?? 0;
      rows = (Array.isArray(data) ? data : []).map(r => [
        r.tech_name, r.tech_jd_id, r.total_os,
        r.total_drop ? Number(r.total_drop).toFixed(1) : '0',
        r.total_bucha||0, r.total_esticador||0, r.total_conector||0, r.total_fixa_cabo||0
      ]);
    } else if (type === 'commissions') {
      // Commissions - sellers
      if (data.sellers?.length > 0) {
        doc.setTextColor(30,58,95); doc.setFontSize(11); doc.setFont('helvetica','bold');
        doc.text('Comissões — Vendedores', 14, startY);
        startY += 5;
        autoTable(doc, {
          head: [['Vendedor','ID','Vendas','Receita','Comissão']],
          body: data.sellers.map(s => [s.name, s.jd_id, s.sales, `R$ ${Number(s.revenue).toFixed(2)}`, `R$ ${Number(s.commission).toFixed(2)}`]),
          startY, styles: { fontSize: 9 },
          headStyles: { fillColor: [30,58,95], textColor: [255,255,255] },
          margin: { left: 14, right: 14 }
        });
        startY = doc.lastAutoTable.finalY + 10;
      }
      if (data.techs?.length > 0) {
        doc.setTextColor(30,58,95); doc.setFontSize(11); doc.setFont('helvetica','bold');
        doc.text('Ganhos — Técnicos', 14, startY);
        startY += 5;
        autoTable(doc, {
          head: [['Técnico','ID','Instalações','Ganho Total']],
          body: data.techs.map(t => [t.name, t.jd_id, t.installations, `R$ ${Number(t.earnings).toFixed(2)}`]),
          startY, styles: { fontSize: 9 },
          headStyles: { fillColor: [30,58,95], textColor: [255,255,255] },
          margin: { left: 14, right: 14 }
        });
      }
      // Footer pages
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text(`Pág ${i}/${pages} — SysFlowCloudi SysFlowCloudi`, 14, doc.internal.pageSize.height - 8); }
      doc.save(`relatorio_comissoes_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('PDF gerado!'); return;
    }

    autoTable(doc, {
      head: [columns], body: rows, startY,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30,58,95], textColor: [255,255,255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245,248,255] },
      margin: { left: 14, right: 14 }
    });

    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150,150,150); doc.text(`Pág ${i}/${pages} — SysFlowCloudi SysFlowCloudi`, 14, doc.internal.pageSize.height - 8); }
    doc.save(`relatorio_${type}_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success('PDF gerado!');
  }

  const fmtR$ = v => `R$ ${Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  const count = Array.isArray(data) ? data.length : (data?.sellers?.length || 0) + (data?.techs?.length || 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Relatórios</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Geração de relatórios em PDF</p>
        </div>
      </div>

      {/* Logo + Commission settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Upload className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Logotipo
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {logo && <img src={logo} alt="Logo" className="h-12 object-contain rounded-lg border" style={{ borderColor: 'var(--border)' }} />}
            <label className="btn-secondary cursor-pointer text-sm">
              <Upload className="w-4 h-4" />{uploadingLogo ? 'Enviando...' : 'Alterar Logotipo'}
              <input type="file" accept="image/*" className="hidden" onChange={uploadLogo} disabled={uploadingLogo} />
            </label>
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <DollarSign className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Comissões e Ganhos
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label">Tipo de Comissão</label>
              <select value={commForm.seller_commission_type} onChange={e => setCommForm(p => ({...p, seller_commission_type: e.target.value}))} className="input text-sm">
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Fixo (R$) por venda</option>
              </select>
            </div>
            <div>
              <label className="label">{commForm.seller_commission_type === 'percent' ? '% por venda' : 'R$ por venda'}</label>
              <input type="number" step="0.01" value={commForm.seller_commission_value} onChange={e => setCommForm(p => ({...p, seller_commission_value: e.target.value}))} className="input text-sm" />
            </div>
            <div>
              <label className="label">R$ por instalação (Téc.)</label>
              <input type="number" step="0.01" value={commForm.tech_commission_value} onChange={e => setCommForm(p => ({...p, tech_commission_value: e.target.value}))} className="input text-sm" />
            </div>
          </div>
          <button onClick={saveCommissions} disabled={savingComm} className="btn-primary mt-3 text-sm">
            <Settings className="w-4 h-4" /> {savingComm ? 'Salvando...' : 'Salvar Comissões'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Filter className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label">Tipo</label>
            <select value={type} onChange={e => { setType(e.target.value); setData([]); }} className="input">
              {REPORT_TYPES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {type === 'sales' && <div><label className="label">Vendedor</label>
            <select value={filters.seller_id} onChange={e => setFilters(p=>({...p,seller_id:e.target.value}))} className="input">
              <option value="">Todos</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>}
          {['installations','materials'].includes(type) && <div><label className="label">Técnico</label>
            <select value={filters.tech_id} onChange={e => setFilters(p=>({...p,tech_id:e.target.value}))} className="input">
              <option value="">Todos</option>{techs.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>}
          <div><label className="label">De</label><input type="date" value={filters.from} onChange={e=>setFilters(p=>({...p,from:e.target.value}))} className="input" /></div>
          <div><label className="label">Até</label><input type="date" value={filters.to} onChange={e=>setFilters(p=>({...p,to:e.target.value}))} className="input" /></div>
        </div>
        <div className="flex gap-3 mt-4 flex-wrap">
          <button onClick={fetchReport} disabled={loading} className="btn-primary">
            <FileBarChart className="w-4 h-4" /> {loading ? 'Buscando...' : 'Gerar Relatório'}
          </button>
          {count > 0 && (
            <button onClick={generatePDF} className="btn-secondary">
              <Download className="w-4 h-4" /> Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {generated && count === 0 && (
        <div className="card text-center py-10">
          <FileBarChart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum dado encontrado</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tente ajustar os filtros ou verificar se há dados cadastrados</p>
        </div>
      )}

      {/* Table preview */}
      {count > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{REPORT_TYPES.find(r=>r.id===type)?.label}</h3>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{count} registros</span>
          </div>
          <div className="overflow-x-auto">
            {type === 'commissions' && typeof data === 'object' && !Array.isArray(data) ? (
              <div className="p-4 space-y-6">
                <div>
                  <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Vendedores</p>
                  <table className="w-full">
                    <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header">Nome</th><th className="table-header">Vendas</th>
                      <th className="table-header">Receita</th><th className="table-header">Comissão</th>
                    </tr></thead>
                    <tbody>{data.sellers?.map((s,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                      <td className="table-cell" style={{color:'var(--text-primary)'}}>{s.name}</td>
                      <td className="table-cell">{s.sales}</td>
                      <td className="table-cell">{fmtR$(s.revenue)}</td>
                      <td className="table-cell font-bold" style={{color:'#22c55e'}}>{fmtR$(s.commission)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
                <div>
                  <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Técnicos</p>
                  <table className="w-full">
                    <thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                      <th className="table-header">Nome</th><th className="table-header">Instalações</th>
                      <th className="table-header">Ganho</th>
                    </tr></thead>
                    <tbody>{data.techs?.map((t,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                      <td className="table-cell" style={{color:'var(--text-primary)'}}>{t.name}</td>
                      <td className="table-cell">{t.installations}</td>
                      <td className="table-cell font-bold" style={{color:'#22c55e'}}>{fmtR$(t.earnings)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </div>
            ) : type === 'sales' ? (
              <table className="w-full"><thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th className="table-header">Cliente</th><th className="table-header">Vendedor</th>
                <th className="table-header">Plano</th><th className="table-header">Valor</th>
                <th className="table-header">Tipo de OS</th>
                <th className="table-header">Status</th><th className="table-header">Data</th>
              </tr></thead><tbody>
                {(Array.isArray(data)?data:[]).map((r,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td className="table-cell" style={{color:'var(--text-primary)'}}>{r.client_name}</td>
                  <td className="table-cell">{r.seller_name}</td>
                  <td className="table-cell">{r.plan_name}</td>
                  <td className="table-cell font-bold" style={{color:'var(--accent)'}}>R$ {Number(r.price).toFixed(2)}</td>
                  <td className="table-cell text-xs" style={{color:'#818cf8'}}>{r.tipo_ordem_servico||'—'}</td>
                  <td className="table-cell"><span className={`badge-${r.client_status}`}>{STATUS_LABEL[r.client_status]||r.client_status}</span></td>
                  <td className="table-cell">{new Date(r.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>)}
              </tbody></table>
            ) : type === 'materials' ? (
              <table className="w-full"><thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th className="table-header">Técnico</th><th className="table-header">OS</th>
                <th className="table-header">DROP(m)</th><th className="table-header">Bucha</th>
                <th className="table-header">Esticador</th><th className="table-header">Conector</th><th className="table-header">Fixa-cabo</th>
              </tr></thead><tbody>
                {(Array.isArray(data)?data:[]).map((r,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td className="table-cell" style={{color:'var(--text-primary)'}}>{r.tech_name}</td>
                  <td className="table-cell">{r.total_os}</td>
                  <td className="table-cell">{r.total_drop?Number(r.total_drop).toFixed(1):'0'}</td>
                  <td className="table-cell">{r.total_bucha||0}</td>
                  <td className="table-cell">{r.total_esticador||0}</td>
                  <td className="table-cell">{r.total_conector||0}</td>
                  <td className="table-cell">{r.total_fixa_cabo||0}</td>
                </tr>)}
              </tbody></table>
            ) : (
              <table className="w-full"><thead><tr style={{borderBottom:'1px solid var(--border)'}}>
                <th className="table-header">OS</th><th className="table-header">Cliente</th>
                <th className="table-header">Técnico</th><th className="table-header">Tipo de OS</th>
                <th className="table-header">Status</th>
                <th className="table-header">DROP</th><th className="table-header">Finalizado</th>
              </tr></thead><tbody>
                {(Array.isArray(data)?data:[]).map((r,i)=><tr key={i} style={{borderBottom:'1px solid var(--border)'}}>
                  <td className="table-cell font-mono" style={{color:'var(--accent)'}}>{r.os_number}</td>
                  <td className="table-cell" style={{color:'var(--text-primary)'}}>{r.client_name}</td>
                  <td className="table-cell">{r.tech_name||'—'}</td>
                  <td className="table-cell text-xs" style={{color:'#818cf8'}}>{r.tipo_ordem_servico||'—'}</td>
                  <td className="table-cell"><span className={`badge-${r.status}`}>{STATUS_LABEL[r.status]||r.status}</span></td>
                  <td className="table-cell">{r.drop_total?`${r.drop_total}m`:'—'}</td>
                  <td className="table-cell">{r.finished_at?new Date(r.finished_at).toLocaleDateString('pt-BR'):'—'}</td>
                </tr>)}
              </tbody></table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
