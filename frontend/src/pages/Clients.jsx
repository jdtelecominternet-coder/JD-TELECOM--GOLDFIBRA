import { useState, useEffect } from 'react';
import api from '../services/api';
import { useSync } from '../hooks/useSync';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, MapPin, Phone, Calendar, MessageCircle, Send, FileText, Link, ChevronDown, ChevronUp, BookUser } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AdminDeleteModal from '../components/AdminDeleteModal';

const statusOpts = ['pendente', 'ativo', 'cancelado'];
const dueDays = [5, 10, 15, 20, 25];

function maskCpf(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function maskPhone(v) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7,11)}`;
}

function maskDate(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`;
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
}

function titleCase(v) {
  return v.replace(/\b\w/g, c => c.toUpperCase());
}

// ── Validador de CPF ──────────────────────────────────────────────────────────
function validarCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return false;
  if (/^(\d)\1+$/.test(d)) return false; // todos dígitos iguais
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(d[i]) * (10 - i);
  let r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(d[i]) * (11 - i);
  r = (soma * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

function StatusBadge({ s }) {
  return <span className={`badge-${s}`}>{s.charAt(0).toUpperCase()+s.slice(1)}</span>;
}

function fmtCpf(v) {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length !== 11) return v;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
}

function fmtPhone(v) {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return v;
}

// ── Gerador de mensagem de boas-vindas ────────────────────────────────────────
function buildWhatsAppMsg(c) {
  const lines = [];
  lines.push(`Olá, ${c.name}!`);
  lines.push(`Seus dados foram cadastrados com sucesso na *SysFlowCloudi*.`);
  lines.push(``);
  lines.push(`*📋 DADOS DO CADASTRO*`);
  if (c.cpf) lines.push(`CPF: ${fmtCpf(c.cpf)}`);
  if (c.birth_date) lines.push(`Nascimento: ${c.birth_date}`);
  if (c.whatsapp) lines.push(`WhatsApp: ${fmtPhone(c.whatsapp)}`);
  if (c.email) lines.push(`E-mail: ${c.email}`);
  if (c.plan_name) lines.push(`Plano: ${c.plan_name}${c.plan_speed ? ` - ${c.plan_speed}` : ''}${c.plan_price ? ` - R$ ${Number(c.plan_price).toFixed(2)}` : ''}`);
  if (c.due_day) lines.push(`Vencimento: Dia ${c.due_day}`);
  lines.push(``);
  if (c.street || c.city) {
    lines.push(`*📍 ENDEREÇO*`);
    const addr = [c.street, c.number, c.complement].filter(Boolean).join(', ');
    if (addr) lines.push(addr);
    if (c.neighborhood) lines.push(`Bairro: ${c.neighborhood}`);
    if (c.city) lines.push(`${c.city}${c.state ? ' - ' + c.state : ''}`);
    if (c.cep) lines.push(`CEP: ${c.cep}`);
    lines.push(``);
  }
  if (c.observations) {
    lines.push(`*📝 OBSERVAÇÕES*`);
    lines.push(c.observations);
    lines.push(``);
  }
  if (c.id) {
    lines.push(`*📄 SEU RELATÓRIO DE PEDIDO*`);
    lines.push(`https://jdtelecom.online/relatorio-pedido/${c.id}`);
    lines.push(``);
  }
  lines.push(`Em caso de dúvidas, entre em contato conosco.`);
  lines.push(`Obrigado por escolher a *SysFlowCloudi*! 🌐`);
  return lines.join('\n');
}

// ── Gerador de mensagem "Pedido PRF" ─────────────────────────────────────────
function buildPRFMsg(c) {
  const lines = [];
  lines.push(`🟢 *PEDIDO DE INSTALAÇÃO - SysFlowCloudi SysFlowCloudi*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(``);
  lines.push(`*👤 DADOS DO CLIENTE*`);
  lines.push(`Nome: ${c.name}`);
  if (c.cpf) lines.push(`CPF: ${fmtCpf(c.cpf)}`);
  if (c.birth_date) lines.push(`Nascimento: ${c.birth_date}`);
  if (c.whatsapp) lines.push(`WhatsApp: ${fmtPhone(c.whatsapp)}`);
  if (c.email) lines.push(`E-mail: ${c.email}`);
  lines.push(``);
  if (c.street || c.city) {
    lines.push(`*📍 ENDEREÇO DE INSTALAÇÃO*`);
    const addr = [c.street, c.number, c.complement].filter(Boolean).join(', ');
    if (addr) lines.push(addr);
    if (c.neighborhood) lines.push(`Bairro: ${c.neighborhood}`);
    if (c.city) lines.push(`${c.city}${c.state ? ' - ' + c.state : ''}`);
    if (c.cep) lines.push(`CEP: ${c.cep}`);
    lines.push(``);
  }
  lines.push(`*📦 PLANO CONTRATADO*`);
  if (c.plan_name) {
    lines.push(`Plano: ${c.plan_name}`);
    if (c.plan_speed) lines.push(`Velocidade: ${c.plan_speed}`);
    if (c.plan_price) lines.push(`Valor: R$ ${Number(c.plan_price).toFixed(2)}`);
  } else {
    lines.push(`Plano: Não selecionado`);
  }
  if (c.due_day) lines.push(`Vencimento: Dia ${c.due_day}`);
  lines.push(``);
  if (c.observations) {
    lines.push(`*📝 OBSERVAÇÕES*`);
    lines.push(c.observations);
    lines.push(``);
  }
  lines.push(`━━━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`✅ Pedido registrado pelo sistema SysFlowCloudi.`);
  lines.push(`Por favor, confirme o agendamento da instalação.`);
  if (c.id) {
    lines.push(``);
    lines.push(`*📄 RELATÓRIO DO PEDIDO*`);
    lines.push(`https://jdtelecom.online/relatorio-pedido/${c.id}`);
  }
  return lines.join('\n');
}

// ── Gerador de PDF ────────────────────────────────────────────────────────────
function gerarPDFCliente(c) {
  const addr = [c.street, c.number, c.complement, c.neighborhood, c.city + (c.state ? '/' + c.state : ''), c.cep ? 'CEP: ' + c.cep : ''].filter(Boolean).join(', ');
  const planStr = c.plan_name
    ? c.plan_name + (c.plan_speed ? ' — ' + c.plan_speed : '') + (c.plan_price ? ' — R$ ' + Number(c.plan_price).toFixed(2) : '')
    : '—';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ficha - ${c.name}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:32px;color:#111;font-size:14px}
    h1{font-size:20px;text-align:center;color:#1e50b4;margin:0 0 4px}
    .sub{text-align:center;color:#555;font-size:13px;margin-bottom:24px}
    .section{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}
    .section-title{font-weight:700;color:#1e50b4;font-size:13px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.5px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .field label{font-size:11px;color:#6b7280;display:block;margin-bottom:2px}
    .field span{font-weight:600;font-size:13px}
    .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px}
    @media print{body{padding:16px}}
  </style></head><body>
  <h1>SysFlowCloudi — SysFlowCloudi</h1>
  <div class="sub">Ficha de Cliente — Gerado em ${new Date().toLocaleDateString('pt-BR')}</div>
  <div class="section">
    <div class="section-title">Dados Pessoais</div>
    <div class="grid">
      <div class="field"><label>Nome Completo</label><span>${c.name || '—'}</span></div>
      <div class="field"><label>CPF</label><span>${fmtCpf(c.cpf) || '—'}</span></div>
      <div class="field"><label>Data de Nascimento</label><span>${c.birth_date || '—'}</span></div>
      <div class="field"><label>WhatsApp</label><span>${fmtPhone(c.whatsapp) || '—'}</span></div>
      <div class="field"><label>E-mail</label><span>${c.email || '—'}</span></div>
      <div class="field"><label>Status</label><span>${c.status || '—'}</span></div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Endereço</div>
    <div class="field"><span>${addr || '—'}</span></div>
  </div>
  <div class="section">
    <div class="section-title">Plano e Pagamento</div>
    <div class="grid">
      <div class="field"><label>Plano</label><span>${planStr}</span></div>
      <div class="field"><label>Vencimento</label><span>${c.due_day ? 'Dia ' + c.due_day : '—'}</span></div>
    </div>
  </div>
  ${c.observations ? `<div class="section"><div class="section-title">Observações</div><div class="field"><span>${c.observations}</span></div></div>` : ''}
  <div class="footer">SysFlowCloudi — SysFlowCloudi | jdtelecom.online</div>
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`;
  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function openWhatsApp(c) {
  if (!c.whatsapp) { toast.error('Cliente sem WhatsApp cadastrado'); return; }
  const num = c.whatsapp.replace(/\D/g, '');
  const phone = num.startsWith('55') ? num : '55' + num;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMsg(c))}`, '_blank');
}

function openWhatsAppPRF(c) {
  if (!c.whatsapp) { toast.error('Cliente sem WhatsApp cadastrado'); return; }
  const num = c.whatsapp.replace(/\D/g, '');
  const phone = num.startsWith('55') ? num : '55' + num;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(buildPRFMsg(c))}`, '_blank');
}

// ── Componente principal ──────────────────────────────────────────────────────

// Carrega destinos salvos do localStorage
function loadDestinos() {
  try { return JSON.parse(localStorage.getItem('wa_destinos') || '[]'); } catch { return []; }
}
function saveDestinos(list) {
  localStorage.setItem('wa_destinos', JSON.stringify(list));
}

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(null);

  // Destinos WhatsApp
  const [destinos, setDestinos] = useState(loadDestinos);
  const [showDestinoPanel, setShowDestinoPanel] = useState(false);
  const [novoDestino, setNovoDestino] = useState({ nome: '', numero: '' });
  const [editDestinoIdx, setEditDestinoIdx] = useState(null);
  // Modal de envio
  const [sendModal, setSendModal] = useState(null); // { client, tipo: 'boasvindas'|'prf' }

  function salvarDestino() {
    const nome = novoDestino.nome.trim();
    const numero = novoDestino.numero.replace(/\D/g, '');
    if (!nome) return toast.error('Informe o nome do contato');
    if (numero.length < 10) return toast.error('Número inválido (mínimo 10 dígitos)');
    let lista;
    if (editDestinoIdx !== null) {
      lista = destinos.map((d, i) => i === editDestinoIdx ? { nome, numero } : d);
      setEditDestinoIdx(null);
    } else {
      lista = [...destinos, { nome, numero }];
    }
    setDestinos(lista);
    saveDestinos(lista);
    setNovoDestino({ nome: '', numero: '' });
    toast.success('Contato salvo!');
  }

  function removerDestino(idx) {
    const lista = destinos.filter((_, i) => i !== idx);
    setDestinos(lista);
    saveDestinos(lista);
  }

  function editarDestino(idx) {
    setNovoDestino({ nome: destinos[idx].nome, numero: destinos[idx].numero });
    setEditDestinoIdx(idx);
    setShowDestinoPanel(true);
  }

  function enviarParaDestino(d) {
    const { client, tipo } = sendModal;
    const phone = d.numero.startsWith('55') ? d.numero : '55' + d.numero;
    const msg = tipo === 'prf' ? buildPRFMsg(client) : buildWhatsAppMsg(client);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSendModal(null);
  }

  function enviarParaCliente() {
    const { client, tipo } = sendModal;
    if (!client.whatsapp) { toast.error('Cliente sem WhatsApp cadastrado'); return; }
    const num = client.whatsapp.replace(/\D/g, '');
    const phone = num.startsWith('55') ? num : '55' + num;
    const msg = tipo === 'prf' ? buildPRFMsg(client) : buildWhatsAppMsg(client);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setSendModal(null);
  }

  async function load() {
    try {
      const [cr, pr, ur] = await Promise.all([
        api.get('/clients'),
        api.get('/plans'),
        user.role === 'admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setClients(cr.data);
      setPlans(pr.data);
      setSellers(ur.data.filter(u => u.role === 'vendedor'));
    } catch {}
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useSync('clients', load);

  async function lookupCep(cep) {
    const clean = cep.replace(/\D/g,'');
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const d = await r.json();
      if (d.erro) { toast.error('CEP não encontrado'); return; }
      setForm(p => ({
        ...p,
        street: titleCase(d.logradouro || ''),
        neighborhood: titleCase(d.bairro || ''),
        city: titleCase(d.localidade || ''),
        state: d.uf,
        cep: clean
      }));
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setCepLoading(false); }
  }

  async function save() {
    if (!form.name?.trim())         return toast.error('Nome completo é obrigatório');
    if (!form.cpf?.trim())          return toast.error('CPF é obrigatório');
    if (!validarCPF(form.cpf))      return toast.error('CPF inválido! Verifique o número digitado');
    if (!form.birth_date?.trim())   return toast.error('Data de nascimento é obrigatória');
    if (!form.whatsapp?.trim())     return toast.error('WhatsApp é obrigatório');
    if (!form.email?.trim())        return toast.error('E-mail é obrigatório');
    if (!form.cep?.trim())          return toast.error('CEP é obrigatório');
    if (!form.street?.trim())       return toast.error('Rua/Logradouro é obrigatório');
    if (!form.number?.trim())       return toast.error('Número é obrigatório');
    if (!form.neighborhood?.trim()) return toast.error('Bairro é obrigatório');
    if (!form.city?.trim())         return toast.error('Cidade é obrigatória');
    if (!form.state?.trim())        return toast.error('Estado é obrigatório');
    if (!form.due_day)              return toast.error('Dia de vencimento é obrigatório');
    if (!form.plan_id)              return toast.error('Plano é obrigatório');
    setSaving(true);
    try {
      if (!form.id) {
        await api.post('/clients', form);
        toast.success('Cliente cadastrado!');
      } else {
        await api.put(`/clients/${form.id}`, form);
        toast.success('Cliente atualizado!');
      }
      setModal(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSaving(false); }
  }

  function openCreate() { setForm({}); setModal('form'); }
  function openEdit(c) { setForm({...c}); setModal('form'); }

  async function del(id) {
    try { await api.delete(`/clients/${id}`); toast.success('Removido'); load(); } catch { toast.error('Erro'); }
  }

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return (!filterStatus || c.status === filterStatus) &&
      (c.name.toLowerCase().includes(q) || c.cpf?.replace(/\D/g,'').includes(q.replace(/\D/g,'')) || c.whatsapp?.includes(q));
  });

  const selectedPlan = plans.find(p => String(p.id) === String(form.plan_id));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Clientes</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{clients.length} clientes cadastrados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDestinoPanel(v => !v)} className="btn-secondary flex items-center gap-2" title="Destinos WhatsApp">
            <BookUser className="w-4 h-4" style={{ color: '#25d366' }} />
            <span className="hidden sm:inline">Destinos WhatsApp</span>
            {showDestinoPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus className="w-4 h-4" /> Novo Cliente</button>
        </div>
      </div>

      {/* ── Painel de destinos WhatsApp ── */}
      {showDestinoPanel && (
        <div className="card p-4 space-y-3" style={{ borderLeft: '4px solid #25d366' }}>
          <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BookUser className="w-4 h-4" style={{ color: '#25d366' }} />
            Contatos de Destino (WhatsApp)
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Salve contatos para enviar formulários/relatórios. Ao clicar em enviar, você escolhe para quem mandar.
          </p>

          {/* Formulário de cadastro */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-36">
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Nome do contato</label>
              <input value={novoDestino.nome} onChange={e => setNovoDestino(n => ({ ...n, nome: e.target.value }))}
                placeholder="Ex: Setor Técnico" className="input text-sm" />
            </div>
            <div className="flex-1 min-w-36">
              <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Número WhatsApp</label>
              <input value={novoDestino.numero} onChange={e => setNovoDestino(n => ({ ...n, numero: maskPhone(e.target.value) }))}
                placeholder="(43) 99999-9999" className="input text-sm" maxLength={16} />
            </div>
            <button onClick={salvarDestino} className="btn-primary text-sm py-2">
              {editDestinoIdx !== null ? 'Atualizar' : 'Salvar Contato'}
            </button>
            {editDestinoIdx !== null && (
              <button onClick={() => { setEditDestinoIdx(null); setNovoDestino({ nome: '', numero: '' }); }}
                className="btn-secondary text-sm py-2">Cancelar</button>
            )}
          </div>

          {/* Lista de contatos salvos */}
          {destinos.length > 0 && (
            <div className="space-y-2 mt-2">
              {destinos.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{d.nome}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>{maskPhone(d.numero)}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => editarDestino(i)} className="p-1 rounded" title="Editar" style={{ color: '#3b82f6' }}><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removerDestino(i)} className="p-1 rounded" title="Remover" style={{ color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {destinos.length === 0 && (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>Nenhum contato salvo ainda.</p>
          )}
        </div>
      )}

      {/* ── Modal de escolha de destino ── */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="card w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
                {sendModal.tipo === 'prf' ? '📋 Enviar Pedido PRF' : '👋 Enviar Boas-vindas'}
              </h3>
              <button onClick={() => setSendModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Escolha para quem enviar a mensagem:</p>

            {/* Enviar para o próprio cliente */}
            <button onClick={enviarParaCliente} className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
              style={{ background: '#dcfce7', border: '1.5px solid #86efac' }}>
              <span style={{ fontSize: 22 }}>👤</span>
              <div>
                <div className="font-bold text-sm" style={{ color: '#166534' }}>Para o cliente</div>
                <div className="text-xs" style={{ color: '#15803d' }}>{sendModal.client.name} — {fmtPhone(sendModal.client.whatsapp) || 'sem número'}</div>
              </div>
            </button>

            {/* Destinos salvos */}
            {destinos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Ou para um contato salvo:</p>
                {destinos.map((d, i) => (
                  <button key={i} onClick={() => enviarParaDestino(d)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                    style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)' }}>
                    <span style={{ fontSize: 20 }}>📞</span>
                    <div>
                      <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{d.nome}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{maskPhone(d.numero)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {destinos.length === 0 && (
              <button onClick={() => { setSendModal(null); setShowDestinoPanel(true); }}
                className="w-full text-sm py-2 rounded-lg" style={{ color: '#25d366', background: '#dcfce7', border: '1px dashed #86efac' }}>
                + Salvar contatos de destino
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, CPF ou WhatsApp..." className="input pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
          <option value="">Todos os status</option>
          {statusOpts.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="table-header">Cliente</th>
                  <th className="table-header">CPF</th>
                  <th className="table-header">Contato</th>
                  <th className="table-header">Plano</th>
                  <th className="table-header">Vendedor</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="table-cell">
                      <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-3 h-3" />{c.city || 'sem cidade'}
                      </p>
                    </td>
                    <td className="table-cell font-mono text-sm" style={{ color: 'var(--text-primary)' }}>{fmtCpf(c.cpf)}</td>
                    <td className="table-cell">
                      {c.whatsapp && <p className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}><Phone className="w-3 h-3" style={{ color: '#4ade80' }} />{fmtPhone(c.whatsapp)}</p>}
                      {c.due_day && <p className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Calendar className="w-3 h-3" />Vence dia {c.due_day}</p>}
                    </td>
                    <td className="table-cell">
                      {c.plan_name ? (
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.plan_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.plan_speed} | R$ {Number(c.plan_price).toFixed(2)}</p>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)' }}>sem plano</span>}
                    </td>
                    <td className="table-cell" style={{ color: 'var(--text-secondary)' }}>{c.seller_name || 'sem vendedor'}</td>
                    <td className="table-cell"><StatusBadge s={c.status} /></td>
                    <td className="table-cell">
                      <div className="flex gap-2 items-center">
                        <button onClick={() => setSendModal({ client: c, tipo: 'boasvindas' })} className="p-1.5 rounded-lg transition-colors" title="Enviar Boas-vindas"
                          style={{ color: '#25d366', background: '#25d36615' }}>
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setSendModal({ client: c, tipo: 'prf' })} className="p-1.5 rounded-lg transition-colors" title="Gerar Pedido PRF"
                          style={{ color: '#fff', background: '#25d366' }}>
                          <Send className="w-4 h-4" />
                        </button>
                        <button onClick={() => gerarPDFCliente(c)} className="p-1.5 rounded-lg transition-colors" title="Gerar PDF"
                          style={{ color: '#3b82f6', background: '#3b82f615' }}>
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => { const url = `${window.location.origin}/relatorio-pedido/${c.id}`; navigator.clipboard.writeText(url); toast.success('Link copiado!'); }} className="p-1.5 rounded-lg transition-colors" title="Copiar Link do Relatório do Pedido"
                          style={{ color: '#a855f7', background: '#a855f715' }}>
                          <Link className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.role === 'admin' && (
                          <button onClick={() => setDeleteModal({ id: c.id, name: c.name })} className="p-1.5 rounded-lg transition-colors" style={{ color: '#f87171' }}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="table-cell text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal de Formulário ── */}
      {modal === 'form' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal-box p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{form.id ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="sm:col-span-2">
                <label className="label">Nome Completo *</label>
                <input value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: titleCase(e.target.value) }))} className="input" placeholder="Nome completo" />
              </div>

              {/* CPF */}
              <div>
                <label className="label">CPF *</label>
                <input value={form.cpf || ''} onChange={e => setForm(p => ({ ...p, cpf: maskCpf(e.target.value) }))} className="input" placeholder="000.000.000-00" maxLength={14} />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="label">Data de Nascimento *</label>
                <input value={form.birth_date || ''} onChange={e => setForm(p => ({ ...p, birth_date: maskDate(e.target.value) }))} className="input" placeholder="dd/mm/aaaa" maxLength={10} />
              </div>

              {/* WhatsApp */}
              <div>
                <label className="label">WhatsApp *</label>
                <input value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: maskPhone(e.target.value) }))} className="input" placeholder="(00) 00000-0000" maxLength={15} />
              </div>

              {/* E-mail */}
              <div>
                <label className="label">E-mail *</label>
                <input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input" placeholder="email@exemplo.com" />
              </div>

              {/* CEP */}
              <div>
                <label className="label">CEP *</label>
                <div className="flex gap-2">
                  <input value={form.cep || ''} onChange={e => setForm(p => ({ ...p, cep: e.target.value.replace(/\D/g,'').slice(0,8) }))} className="input" placeholder="00000000" maxLength={8} />
                  <button type="button" onClick={() => lookupCep(form.cep||'')} disabled={cepLoading} className="btn-secondary whitespace-nowrap px-3">
                    {cepLoading ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              {/* Rua */}
              <div className="sm:col-span-2">
                <label className="label">Rua/Logradouro *</label>
                <input value={form.street || ''} onChange={e => setForm(p => ({ ...p, street: titleCase(e.target.value) }))} className="input" />
              </div>

              {/* Número */}
              <div>
                <label className="label">Número *</label>
                <input value={form.number || ''} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} className="input" />
              </div>

              {/* Complemento */}
              <div>
                <label className="label">Complemento</label>
                <input value={form.complement || ''} onChange={e => setForm(p => ({ ...p, complement: titleCase(e.target.value) }))} className="input" />
              </div>

              {/* Bairro */}
              <div>
                <label className="label">Bairro *</label>
                <input value={form.neighborhood || ''} onChange={e => setForm(p => ({ ...p, neighborhood: titleCase(e.target.value) }))} className="input" />
              </div>

              {/* Cidade */}
              <div>
                <label className="label">Cidade *</label>
                <input value={form.city || ''} onChange={e => setForm(p => ({ ...p, city: titleCase(e.target.value) }))} className="input" />
              </div>

              {/* Estado */}
              <div>
                <label className="label">Estado *</label>
                <input value={form.state || ''} onChange={e => setForm(p => ({ ...p, state: e.target.value.slice(0,2).toUpperCase() }))} className="input" maxLength={2} />
              </div>

              {/* Vencimento */}
              <div>
                <label className="label">Dia de Vencimento *</label>
                <select value={form.due_day || ''} onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} className="input">
                  <option value="">Selecione</option>
                  {dueDays.map(d => <option key={d} value={d}>Dia {d}</option>)}
                </select>
              </div>

              {/* Plano */}
              <div>
                <label className="label">Plano *</label>
                <select value={form.plan_id || ''} onChange={e => setForm(p => ({ ...p, plan_id: e.target.value }))} className="input">
                  <option value="">Selecione um plano</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} - {p.speed} - R$ {Number(p.price).toFixed(2)}</option>)}
                </select>
              </div>

              {/* Vendedor (admin) */}
              {user.role === 'admin' && (
                <div>
                  <label className="label">Vendedor</label>
                  <select value={form.seller_id || ''} onChange={e => setForm(p => ({ ...p, seller_id: e.target.value }))} className="input">
                    <option value="">Selecione</option>
                    {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Status (admin + edit) */}
              {user.role === 'admin' && form.id && (
                <div>
                  <label className="label">Status</label>
                  <select value={form.status || 'pendente'} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input">
                    {statusOpts.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
              )}

              {/* Observações */}
              {user.role === 'admin' && (
                <div className="sm:col-span-2">
                  <label className="label flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" style={{ color: '#25d366' }} />
                    Observações (incluída na mensagem do WhatsApp)
                  </label>
                  <textarea value={form.observations || ''} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} className="input resize-none" rows={3} placeholder="Ex: Instalação agendada para 20/04..." />
                </div>
              )}
              {user.role !== 'admin' && form.observations && (
                <div className="sm:col-span-2">
                  <label className="label flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" style={{ color: '#25d366' }} />
                    Observações
                  </label>
                  <div className="input text-sm" style={{ minHeight: 60, color: 'var(--text-muted)', opacity: 0.7 }}>{form.observations}</div>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Somente o administrador pode alterar.</p>
                </div>
              )}

              {/* Botões WhatsApp + PDF */}
              {form.whatsapp && (
                <div className="sm:col-span-2">
                  <div className="rounded-xl p-4" style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)' }}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#25d366' }}>Envio via WhatsApp</p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button"
                        onClick={() => openWhatsApp({ ...form, plan_name: selectedPlan?.name, plan_speed: selectedPlan?.speed, plan_price: selectedPlan?.price })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: 'rgba(37,211,102,0.15)', color: '#25d366', border: '1px solid rgba(37,211,102,0.4)' }}>
                        <MessageCircle className="w-4 h-4" /> Boas-vindas ao Cliente
                      </button>
                      <button type="button"
                        onClick={() => openWhatsAppPRF({ ...form, plan_name: selectedPlan?.name, plan_speed: selectedPlan?.speed, plan_price: selectedPlan?.price })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: '#25d366', color: '#fff' }}>
                        <Send className="w-4 h-4" /> Gerar Pedido PRF via WhatsApp
                      </button>
                      <button type="button"
                        onClick={() => gerarPDFCliente({ ...form, plan_name: selectedPlan?.name, plan_speed: selectedPlan?.speed, plan_price: selectedPlan?.price })}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                        style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}>
                        <FileText className="w-4 h-4" /> Gerar PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      <AdminDeleteModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        itemName={deleteModal?.name || 'este cliente'}
        onConfirmed={() => del(deleteModal.id)}
      />
    </div>
  );
}
