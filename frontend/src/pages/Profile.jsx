import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Camera, User, Mail, Phone, Lock, Eye, EyeOff, FileText, Download, BarChart2, Fingerprint } from 'lucide-react';
import { generateOrderPDF } from '../utils/generateOrderPDF';
import { generateSalesReportPDF } from '../utils/generateSalesReportPDF';
import { useAuth } from '../contexts/AuthContext';

const roleLabel = { admin: 'Administrador', vendedor: 'Vendedor', tecnico: 'Tecnico', manutencao: 'Técnico de Rede' };
const sellerStatusLabel = { pendente: 'Pendente', pago: 'Pago', cancelado: 'Cancelado', servico_concluido: 'Instalado' };
const sellerStatusColor = { pendente: '#fff', pago: '#fff', cancelado: '#fff', servico_concluido: '#fff' };
const sellerStatusBg    = { pendente: '#f97316', pago: '#22c55e', cancelado: '#ef4444', servico_concluido: '#22c55e' };
const installPeriodLabel = { manha: 'Manhã ☀️', tarde: 'Tarde 🌤️' };
const statusLabel = { pendente: 'Pendente', em_deslocamento: 'Em Deslocamento', em_execucao: 'Em Execucao', finalizado: 'Finalizado', cancelado: 'Cancelado' };

function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromB64url(str) {
  str = (str || '').replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}
function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }

function BiometriaSection() {
  const [supported, setSupported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isMobile()) return;
    if (!window.PublicKeyCredential) return;
    setSupported(true);
    setRegistered(!!localStorage.getItem('jd_bio_cred'));
  }, []);

  if (!isMobile() || !supported) return null;

  async function registerBio() {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/webauthn/challenge', {});
      const challenge = fromB64url(data.challenge);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: 'SysFlowCloudi', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(String(user.id)),
            name: user.jd_id,
            displayName: user.name,
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
          authenticatorSelection: { userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000,
          attestation: 'none',
        }
      });
      const credId = b64url(cred.rawId);
      const pubkey = b64url(cred.response.getPublicKey ? cred.response.getPublicKey() : new ArrayBuffer(0));
      await api.post('/auth/webauthn/register', { credentialId: credId, publicKey: pubkey });
      localStorage.setItem('jd_bio_cred', credId);
      setRegistered(true);
      toast.success('✅ Biometria ativada com sucesso!');
    } catch (err) {
      if (err?.name === 'NotAllowedError') toast.error('Biometria cancelada pelo usuário');
      else toast.error(err.response?.data?.error || '❌ Erro ao ativar biometria');
    } finally { setLoading(false); }
  }

  async function revokeBio() {
    setLoading(true);
    try {
      await api.delete('/auth/webauthn/revoke');
      localStorage.removeItem('jd_bio_cred');
      setRegistered(false);
      toast.success('Biometria removida.');
    } catch { toast.error('Erro ao remover biometria'); }
    finally { setLoading(false); }
  }

  return (
    <div className="card p-6 mt-4">
      <h3 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
        <span style={{ fontSize: 20 }}>👆</span> Biometria / Face ID
      </h3>
      {registered ? (
        <div>
          <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#86efac' }}>
            ✅ Biometria ativada neste dispositivo — você pode entrar sem senha
          </div>
          <button onClick={revokeBio} disabled={loading}
            style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #dc2626', background: 'transparent', color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
            {loading ? 'Removendo...' : '🗑️ Remover Biometria'}
          </button>
        </div>
      ) : (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
            Ative para entrar usando sua digital ou reconhecimento facial sem precisar digitar senha.
          </p>
          <button onClick={registerBio} disabled={loading}
            style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>👆</span>
            {loading ? 'Ativando...' : 'Ativar Biometria / Face ID'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [myStats, setMyStats] = useState(null);
  const [myOrders, setMyOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(null);
  const [gerandoLink, setGerandoLink] = useState(false);
  const [linkGerado, setLinkGerado] = useState('');
  const [linkStatus, setLinkStatus] = useState('ativo'); // ativo | usado | verificando
  const linkTokenRef = useRef('');

  async function verificarToken(token) {
    if (!token) return;
    setLinkStatus('verificando');
    try {
      const r = await api.get('/solicitations/validate-token/' + token);
      setLinkStatus(r.data.valid ? 'ativo' : 'usado');
    } catch { setLinkStatus('ativo'); }
  }

  async function gerarLink() {
    setGerandoLink(true);
    try {
      const r = await api.post('/solicitations/token');
      const token = r.data.token || new URL(r.data.link).searchParams.get('token');
      const link = `${window.location.origin}/solicitar?token=${token}`;
      setLinkGerado(link);
      setLinkStatus('ativo');
      linkTokenRef.current = token;
      navigator.clipboard.writeText(link);
      toast.success('Link copiado! Envie ao cliente.');
    } catch { toast.error('Erro ao gerar link'); }
    finally { setGerandoLink(false); }
  }

  async function load() {
    try {
      const reqs = [api.get('/users/me'), api.get('/users/me/stats')];
      if (authUser.role === 'vendedor') reqs.push(api.get('/orders'));
      const [pr, sr, or] = await Promise.all(reqs);
      setProfile(pr.data);
      setForm({ email: pr.data.email || '', phone: pr.data.phone || '' });
      setMyStats(sr.data);
      if (or) setMyOrders(or.data);
    } catch {}
  }
  useEffect(() => { load(); }, []);

  async function handleGeneratePDF(order) {
    setGeneratingPdf(order.id);
    try {
      const cr = await api.get(`/clients/${order.client_id}`).catch(() => ({ data: {} }));
      const merged = {
        ...order,
        ...cr.data,
        client_name: order.client_name,
        plan_name: order.plan_name,
        plan_speed: order.plan_speed,
        plan_price: order.plan_price,
        seller_name: order.seller_name,
        technician_name: order.technician_name,
        due_day: cr.data.due_day,
        observations: order.observations,
      };
      generateOrderPDF(merged);
      toast.success('PDF gerado com sucesso!');
    } catch { toast.error('Erro ao gerar PDF'); }
    finally { setGeneratingPdf(null); }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put('/users/me/profile', form);
      toast.success('Perfil atualizado!');
      load();
    } catch { toast.error('Erro'); }
    finally { setSaving(false); }
  }

  async function savePassword() {
    if (!pwForm.current_password || !pwForm.new_password) return toast.error('Preencha todos os campos');
    if (pwForm.new_password !== pwForm.confirm) return toast.error('Senhas nao coincidem');
    if (pwForm.new_password.length < 4) return toast.error('Minimo 4 caracteres');
    setSavingPw(true);
    try {
      await api.put('/users/me/password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Senha alterada!');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Erro'); }
    finally { setSavingPw(false); }
  }

  async function uploadPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const r = await api.post('/users/me/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      updateUser({ photo_url: r.data.photo_url });
      toast.success('Foto atualizada!');
      load();
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); }
  }

  if (!profile) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const clients = myStats?.clients || [];
  const orders = myStats?.orders || [];



  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Meu Perfil</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Gerencie suas informacoes pessoais</p>
      </div>
      {/* Link de Cadastro - somente admin e vendedor */}
      {(authUser.role === 'admin' || authUser.role === 'vendedor') && (authUser.permissions?.gerar_link !== false) && (
      <div className="card p-5">
        <h2 className="text-lg font-bold mb-1" style={{color:'var(--text-primary)'}}>Link de Cadastro de Cliente</h2>
        <p className="text-xs mb-3" style={{color:'var(--text-muted)'}}>
          Gere um link único e envie ao cliente para ele preencher os dados. O link só funciona uma vez — não teste enviando o formulário.
          <br/><span style={{color:'var(--accent)',fontWeight:'bold'}}>📌 As vendas realizadas por este link ficam registradas no seu nome.</span>
        </p>

        {linkGerado && (
          <div className="mb-3 rounded-xl overflow-hidden" style={{border:'1px solid var(--border)'}}>
            <div className="flex items-center justify-between px-3 py-2" style={{background:'var(--bg-input)'}}>
              <span className="text-xs font-mono truncate flex-1 mr-2" style={{color:'var(--accent)'}}>{linkGerado}</span>
              {linkStatus === 'ativo'  && <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{background:'#22c55e22',color:'#22c55e'}}>● Ativo</span>}
              {linkStatus === 'usado'  && <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{background:'#f59e0b22',color:'#f59e0b'}}>✔ Utilizado</span>}
              {linkStatus === 'verificando' && <span className="text-xs px-2 py-0.5 flex-shrink-0" style={{color:'var(--text-muted)'}}>verificando...</span>}
            </div>
            {linkStatus === 'usado' && (
              <div className="px-3 py-2 text-xs" style={{background:'#f59e0b11',color:'#f59e0b'}}>
                Este link já foi utilizado. Gere um novo link para enviar ao próximo cliente.
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button onClick={gerarLink} disabled={gerandoLink} className="btn-primary flex-1">
            {gerandoLink ? 'Gerando...' : linkGerado ? 'Gerar Novo Link' : 'Gerar Link'}
          </button>
          {linkGerado && linkStatus === 'ativo' && (
            <button onClick={() => { navigator.clipboard.writeText(linkGerado); toast.success('Link copiado!'); }} className="btn-secondary">
              Copiar
            </button>
          )}
        </div>
      </div>
      )}


      {/* Photo + Info */}
      <div className="card flex items-start gap-5 flex-wrap">
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
            {profile.photo_url
              ? <img src={profile.photo_url} alt="Perfil" className="w-full h-full object-cover" />
              : <User className="w-10 h-10" style={{ color: 'var(--text-muted)' }} />}
          </div>
          <label className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            style={{ background: 'var(--accent)' }}>
            <Camera className="w-4 h-4" style={{ color: 'var(--bg-main)' }} />
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} />
          </label>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{profile.name}</h2>
          <p className="font-mono font-bold" style={{ color: 'var(--accent)' }}>{profile.jd_id}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{roleLabel[profile.role]}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {profile.email && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Mail className="w-3 h-3" />{profile.email}</span>}
            {profile.phone && <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}><Phone className="w-3 h-3" />{profile.phone}</span>}
          </div>
        </div>
      </div>

      {/* Stats */}
      {(clients.length > 0 || orders.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {authUser.role === 'vendedor' && <>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{clients.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Clientes</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{clients.filter(c=>c.status==='ativo').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ativos</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#facc15' }}>{myOrders.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pedidos</p>
            </div>
          </>}
          {authUser.role === 'tecnico' && <>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{orders.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total OS</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#4ade80' }}>{orders.filter(o=>o.status==='finalizado').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Finalizadas</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-black" style={{ color: '#facc15' }}>{orders.filter(o=>o.status==='pendente').length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pendentes</p>
            </div>
          </>}
        </div>
      )}

      {/* ── MEUS PEDIDOS - EXPORTAR PDF (somente vendedor) ── */}
      {authUser.role === 'vendedor' && myOrders.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FileText className="w-5 h-5" style={{ color: '#ef4444' }} />
              Meus Pedidos — Exportar PDF
            </h3>
            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#ef444415', color: '#ef4444' }}>
              {myOrders.length} pedido(s)
            </span>
          </div>
              <button
                onClick={() => generateSalesReportPDF(authUser, myOrders)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-bold text-white"
                style={{ background: 'var(--accent)' }}>
                <BarChart2 className="w-3.5 h-3.5" />
                Relatório PDF
              </button>

          <div className="space-y-3">
            {myOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm font-mono" style={{ color: 'var(--accent)' }}>
                      {o.readable_id || o.os_number}
                    </span>
                    <span className={`badge-${o.status}`}>
                      {statusLabel[o.status] || o.status}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: sellerStatusBg[o.seller_status||'pendente'], color: sellerStatusColor[o.seller_status||'pendente'] }}>
                      {sellerStatusLabel[o.seller_status||'pendente']}
                    </span>
                  </div>
                  <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                    {o.client_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {o.plan_name || 'Sem plano'} {o.plan_speed ? `— ${o.plan_speed}` : '' }
                    {o.plan_price ? ` — R$ ${Number(o.plan_price).toFixed(2)}` : '' }
                  </p>
                  {o.scheduled_date && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {`Agendado: ${new Date(o.scheduled_date).toLocaleDateString('pt-BR')}${o.install_period ? ' — ' + (installPeriodLabel[o.install_period]||o.install_period) : ''}`}
                    </p>
                  )}
                  {o.admin_message && (
                    <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: '#f59e0b18', border: '1px solid #f59e0b55', color: '#b45309' }}>
                      <span className="font-bold">📢 Admin: </span>{o.admin_message}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleGeneratePDF(o)}
                  disabled={generatingPdf === o.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm flex-shrink-0 transition-all"
                  style={{ background: generatingPdf === o.id ? '#ef444430' : '#ef4444', color: '#fff', opacity: generatingPdf === o.id ? 0.7 : 1 }}
                >
                  {generatingPdf === o.id
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Gerando...</>
                    : <><Download className="w-4 h-4" /> Exportar PDF</>
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MINHAS ORDENS E GANHOS (somente técnico) ── */}
      {authUser.role === 'tecnico' && orders.length > 0 && (() => {
        const finalizadas = orders.filter(o => o.status === 'finalizado');
        const totalGanho  = finalizadas.reduce((s, o) => s + Number(o.valor_servico || 0), 0);
        const totalPago   = finalizadas.filter(o => o.status_pagamento_tecnico === 'pago').reduce((s, o) => s + Number(o.valor_servico || 0), 0);
        const totalPendente = totalGanho - totalPago;
        return (
          <div className="card">
            <h3 className="font-bold flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
              <BarChart2 className="w-5 h-5" style={{ color: '#10b981' }} />
              Minhas Ordens e Ganhos
            </h3>
            {/* Resumo financeiro */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl p-3 text-center" style={{ background: '#10b98115', border: '1px solid #10b98133' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total Ganho</p>
                <p className="text-lg font-black" style={{ color: '#10b981' }}>R$ {totalGanho.toFixed(2).replace('.',',')}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: '#f59e0b15', border: '1px solid #f59e0b33' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>A Receber</p>
                <p className="text-lg font-black" style={{ color: '#f59e0b' }}>R$ {totalPendente.toFixed(2).replace('.',',')}</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: '#22c55e15', border: '1px solid #22c55e33' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Já Pago</p>
                <p className="text-lg font-black" style={{ color: '#22c55e' }}>R$ {totalPago.toFixed(2).replace('.',',')}</p>
              </div>
            </div>
            {/* Tabela de OS */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="table-header">ID OS</th>
                    <th className="table-header">Tipo de Serviço</th>
                    <th className="table-header">Data</th>
                    <th className="table-header">Valor</th>
                    <th className="table-header">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="table-cell font-mono font-bold" style={{ color: 'var(--accent)' }}>{o.readable_id || o.os_number}</td>
                      <td className="table-cell text-xs" style={{ color: '#818cf8' }}>{o.tipo_ordem_servico || '—'}</td>
                      <td className="table-cell" style={{ color: 'var(--text-muted)' }}>{o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('pt-BR') : new Date(o.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="table-cell font-bold" style={{ color: '#10b981' }}>
                        {o.valor_servico != null ? `R$ ${Number(o.valor_servico).toFixed(2).replace('.',',')}` : '—'}
                      </td>
                      <td className="table-cell">
                        {o.status !== 'finalizado'
                          ? <span className={`badge-${o.status}`}>{statusLabel[o.status] || o.status}</span>
                          : <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: o.status_pagamento_tecnico === 'pago' ? '#22c55e22' : '#f59e0b22', color: o.status_pagamento_tecnico === 'pago' ? '#22c55e' : '#f59e0b' }}>
                              {o.status_pagamento_tecnico === 'pago' ? '✔ Pago' : '⏳ Pendente'}
                            </span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Edit Profile */}
      <div className="card">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Editar Contato</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label"><Mail className="w-3 h-3 inline mr-1" />E-mail</label>
            <input value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} className="input" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="label"><Phone className="w-3 h-3 inline mr-1" />Telefone</label>
            <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} className="input" placeholder="(00) 00000-0000" />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary mt-4 text-sm">
          {saving ? 'Salvando...' : 'Salvar Contato'}
        </button>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Lock className="w-4 h-4" style={{ color: 'var(--accent)' }} />Alterar Senha
        </h3>
        <div className="space-y-3">
          <div>
            <label className="label">Senha Atual</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={pwForm.current_password}
                onChange={e=>setPwForm(p=>({...p,current_password:e.target.value}))} className="input pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nova Senha</label>
            <input type="password" value={pwForm.new_password} onChange={e=>setPwForm(p=>({...p,new_password:e.target.value}))} className="input" />
          </div>
          <div>
            <label className="label">Confirmar Nova Senha</label>
            <input type="password" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} className="input" />
          </div>
        </div>
        <button onClick={savePassword} disabled={savingPw} className="btn-primary mt-4 text-sm">
          {savingPw ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </div>

      <BiometriaSection />
    </div>
  );
}
