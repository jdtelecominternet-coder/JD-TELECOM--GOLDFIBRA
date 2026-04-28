import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw, FileText, MessageCircle, Trash2 } from 'lucide-react';
import AdminDeleteModal from '../components/AdminDeleteModal';

const periodLabel = { manha: 'Manha', tarde: 'Tarde' };
const statusStyle = {
  pendente:  { color: '#f59e0b', bg: '#fef3c7' },
  aprovado:  { color: '#22c55e', bg: '#dcfce7' },
  rejeitado: { color: '#ef4444', bg: '#fee2e2' },
};

function gerarPDF(s) {
  const planStr = s.plan_name ? s.plan_name + (s.plan_speed ? ' — ' + s.plan_speed + ' Mbps' : '') : 'Não informado';
  const addr = [s.street, s.number, s.complement, s.neighborhood, s.city + (s.state ? '/' + s.state : ''), s.cep].filter(Boolean).join(', ');
  const dataSol = s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Solicitacao - ${s.name}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;font-size:14px}
    .logo{text-align:center;margin-bottom:24px}
    h1{font-size:20px;text-align:center;color:#1e50b4;margin:0 0 4px}
    .sub{text-align:center;color:#555;font-size:13px;margin-bottom:24px}
    .section{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}
    .section-title{font-weight:700;color:#1e50b4;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .field label{font-size:11px;color:#6b7280;display:block;margin-bottom:2px}
    .field span{font-weight:600;font-size:13px}
    .addr{font-size:13px;color:#374151;margin-top:4px}
    .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px}
    @media print{body{padding:16px}}
  </style></head><body>
  <div class="logo">
    <h1>SysFlowCloudi — SysFlowCloudi</h1>
    <div class="sub">Solicitacao de Instalacao • ${dataSol}</div>
  </div>
  <div class="section">
    <div class="section-title">Dados Pessoais</div>
    <div class="grid">
      <div class="field"><label>Nome Completo</label><span>${s.name || '—'}</span></div>
      <div class="field"><label>WhatsApp</label><span>${s.whatsapp || '—'}</span></div>
      <div class="field"><label>CPF</label><span>${s.cpf || '—'}</span></div>
      <div class="field"><label>Data de Nascimento</label><span>${s.birth_date || '—'}</span></div>
      <div class="field"><label>E-mail</label><span>${s.email || '—'}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Endereço</div>
    <div class="addr">${addr || '—'}</div>
  </div>
  <div class="section">
    <div class="section-title">Plano e Instalação</div>
    <div class="grid">
      <div class="field"><label>Plano Desejado</label><span>${planStr}</span></div>
      <div class="field"><label>Período Preferido</label><span>${s.install_period ? periodLabel[s.install_period] || s.install_period : '—'}</span></div>
    </div>
    ${s.observations ? `<div class="field" style="margin-top:10px"><label>Observações</label><span>${s.observations}</span></div>` : ''}
  </div>
  <div class="footer">SysFlowCloudi — SysFlowCloudi | jdtelecom.online | Documento gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function enviarWhatsApp(s) {
  const num = (s.whatsapp || '').replace(/\D/g, '');
  if (!num) return toast.error('WhatsApp não informado');
  const planStr = s.plan_name ? s.plan_name + (s.plan_speed ? ' - ' + s.plan_speed + ' Mbps' : '') : 'Não informado';
  const addr = [s.street, s.number, s.neighborhood, s.city].filter(Boolean).join(', ');
  const msg = encodeURIComponent(
    `Olá ${s.name}! 👋\n\n` +
    `Recebemos sua solicitação de instalação da *SysFlowCloudi*! 🚀\n\n` +
    `📋 *Resumo do Pedido:*\n` +
    `• Nome: ${s.name}\n` +
    (s.cpf ? `• CPF: ${s.cpf}\n` : '') +
    `• WhatsApp: ${s.whatsapp}\n` +
    (addr ? `• Endereço: ${addr}\n` : '') +
    `• Plano: ${planStr}\n` +
    (s.install_period ? `• Período: ${periodLabel[s.install_period] || s.install_period}\n` : '') +
    (s.observations ? `• Obs: ${s.observations}\n` : '') +
    `\nEm breve nossa equipe entrará em contato para agendar a instalação. ✅`
  );
  window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
}

export default function Solicitations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pendente');
  const [deleteModal, setDeleteModal] = useState(null); // { id, name }

  async function load() {
    setLoading(true);
    try { const r = await api.get('/solicitations'); setItems(r.data); }
    catch { toast.error('Erro ao carregar solicitacoes'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function approve(id) {
    if (!window.confirm('Aprovar e criar cliente no sistema?')) return;
    try { await api.put('/solicitations/' + id + '/approve'); toast.success('Cliente criado com sucesso!'); load(); }
    catch { toast.error('Erro ao aprovar'); }
  }

  async function reject(id) {
    if (!window.confirm('Rejeitar esta solicitacao?')) return;
    try { await api.put('/solicitations/' + id + '/reject'); toast.success('Solicitacao rejeitada'); load(); }
    catch { toast.error('Erro ao rejeitar'); }
  }

  async function deletar(id) {
    try { await api.delete('/solicitations/' + id); toast.success('Solicitação deletada!'); load(); }
    catch { toast.error('Erro ao deletar'); }
  }

  const filtered = items.filter(i => i.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:'var(--text-primary)'}}>Solicitacoes de Clientes</h1>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>{items.filter(i=>i.status==='pendente').length} pendente(s)</p>
        </div>
        <button onClick={load} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div style={{background:'var(--bg-card)',borderRadius:10,padding:'4px',display:'inline-flex',gap:4}}>
        {[['pendente','Pendentes'],['aprovado','Aprovados'],['rejeitado','Rejeitados']].map(([k,l]) => (
          <button key={k} onClick={()=>setFilter(k)}
            style={{padding:'6px 16px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:600,fontSize:13,
              background:filter===k?'#1e50b4':'transparent',color:filter===k?'#fff':'var(--text-secondary)'}}>
            {l} ({items.filter(i=>i.status===k).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'var(--accent)',borderTopColor:'transparent'}} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16" style={{color:'var(--text-muted)'}}>Nenhuma solicitacao {filter}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const st = statusStyle[s.status] || statusStyle.pendente;
            const addr = [s.street, s.number, s.complement, s.neighborhood, s.city, s.state].filter(Boolean).join(', ');
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-black text-base" style={{color:'var(--text-primary)'}}>{s.name}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:st.bg,color:st.color}}>{s.status}</span>
                      {s.seller_name && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background:'rgba(99,102,241,0.12)',color:'#818cf8'}}>
                          🧑‍💼 {s.seller_name}
                        </span>
                      )}
                      <span className="text-xs" style={{color:'var(--text-muted)'}}>
                        {s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                      {[
                        ['WhatsApp', s.whatsapp],
                        ['E-mail', s.email],
                        ['CPF', s.cpf],
                        ['Nascimento', s.birth_date],
                        ['Plano', s.plan_name ? s.plan_name + (s.plan_speed ? ' - ' + s.plan_speed + ' Mbps' : '') : null],
                        ['Periodo', s.install_period ? periodLabel[s.install_period] : null],
                        ['CEP', s.cep],
                      ].filter(([,v])=>v).map(([label,value]) => (
                        <div key={label} className="p-2 rounded-lg" style={{background:'var(--bg-input)'}}>
                          <p className="text-xs" style={{color:'var(--text-muted)'}}>{label}</p>
                          <p className="font-semibold text-xs" style={{color:'var(--text-primary)'}}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {addr && (
                      <p className="text-xs mt-2 p-2 rounded-lg" style={{background:'var(--bg-input)',color:'var(--text-secondary)'}}>
                        📍 {addr}
                      </p>
                    )}
                    {s.observations && (
                      <p className="text-xs mt-1 italic" style={{color:'var(--text-secondary)'}}>
                        💬 {s.observations}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-32">
                    {s.status === 'pendente' && (
                      <>
                        <button onClick={()=>approve(s.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold" style={{background:'#22c55e22',color:'#22c55e',border:'none',cursor:'pointer'}}>
                          <CheckCircle className="w-4 h-4" /> Aprovar
                        </button>
                        <button onClick={()=>reject(s.id)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold" style={{background:'#ef444422',color:'#ef4444',border:'none',cursor:'pointer'}}>
                          <XCircle className="w-4 h-4" /> Rejeitar
                        </button>
                      </>
                    )}
                    <button onClick={()=>gerarPDF(s)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold" style={{background:'#3b82f622',color:'#3b82f6',border:'none',cursor:'pointer'}}>
                      <FileText className="w-4 h-4" /> PDF
                    </button>
                    <button onClick={()=>enviarWhatsApp(s)} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold" style={{background:'#25d36622',color:'#25d366',border:'none',cursor:'pointer'}}>
                      <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button onClick={()=>setDeleteModal({ id: s.id, name: s.client_name || 'solicitação' })} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold" style={{background:'#ef444422',color:'#ef4444',border:'none',cursor:'pointer'}}>
                      <Trash2 className="w-4 h-4" /> Deletar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AdminDeleteModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        itemName={deleteModal?.name || 'esta solicitação'}
        onConfirmed={() => deletar(deleteModal.id)}
      />
    </div>
  );
}
