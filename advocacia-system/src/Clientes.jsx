import { useState } from 'react';
import { getClients, addClient, updateClient, deleteClient, getProcessesByClient } from './store';
import { Plus, Search, Trash2, Edit, X, User, Building2, Phone, Mail, FileText, RefreshCw, Copy, Check, KeyRound, BadgeCheck } from 'lucide-react';

export default function Clientes({ user }) {
  const [clients, setClients] = useState(getClients());
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [viewClient, setViewClient] = useState(null);
  const [copied, setCopied] = useState(null);

  const reload = () => setClients(getClients());

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  function gerarSenha() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  function openNew() {
    const senha = gerarSenha();
    setForm({ type: 'pessoa', password: senha });
    setModal('new');
  }
  function openEdit(c) { setForm({ ...c }); setModal(c.id); }

  const [savedClient, setSavedClient] = useState(null);

  function handleSave() {
    if (modal === 'new') {
      const result = addClient(form);
      if (result) { reload(); setSavedClient(result); setModal(null); }
    } else {
      updateClient(modal, form);
      reload();
      setModal(null);
    }
  }

  function handleDelete(id) {
    if (confirm('Excluir este cliente?')) { deleteClient(id); reload(); }
  }

  const processCount = (id) => getProcessesByClient(id).length;

  return (
    <div className="animate-fadeIn">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Clientes</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>{clients.length} clientes cadastrados</p>
        </div>
        <button className="btn-gold" onClick={openNew} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--white-dim)' }} />
        <input className="input-dark" style={{ paddingLeft: '36px', maxWidth: '400px' }} placeholder="Buscar por nome, CPF/CNPJ ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
        {filtered.map(c => (
          <div key={c.id} className="card" style={{ padding: '20px', cursor: 'pointer' }} onClick={() => setViewClient(c)}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {c.type === 'empresa' ? <Building2 size={20} color="#0A0A0A" /> : <User size={20} color="#0A0A0A" />}
                </div>
                <div>
                  <div style={{ color: 'var(--white)', fontSize: '14px', fontWeight: '500' }}>{c.name}</div>
                  <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>{c.type === 'empresa' ? 'Empresa' : 'Pessoa Física'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(c)} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}><Edit size={13} /></button>
                <button onClick={() => handleDelete(c.id)} style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', color: 'var(--red)', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {c.cpfCnpj && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><FileText size={12} color="var(--gold-dark)" /><span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{c.cpfCnpj}</span></div>}
              {c.phone && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Phone size={12} color="var(--gold-dark)" /><span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{c.phone}</span></div>}
              {c.email && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><Mail size={12} color="var(--gold-dark)" /><span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{c.email}</span></div>}
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(201,168,76,0.08)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--white-dim)', fontSize: '12px' }}>Processos:</span>
              <span style={{ color: 'var(--gold)', fontSize: '12px', fontWeight: '600' }}>{processCount(c.id)}</span>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>Nenhum cliente encontrado.</div>}
      </div>

      {/* View modal */}
      {viewClient && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '0.08em' }}>Ficha do Cliente</h2>
              <button onClick={() => setViewClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', padding: '16px', background: 'var(--black-4)', borderRadius: '8px' }}>
              <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, var(--gold-dark), var(--gold))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {viewClient.type === 'empresa' ? <Building2 size={24} color="#0A0A0A" /> : <User size={24} color="#0A0A0A" />}
              </div>
              <div>
                <div style={{ color: 'var(--white)', fontSize: '18px', fontWeight: '600' }}>{viewClient.name}</div>
                <div style={{ color: 'var(--gold)', fontSize: '12px' }}>{viewClient.type === 'empresa' ? 'Pessoa Jurídica' : 'Pessoa Física'}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {[['Usuário', viewClient.username], ['CPF/CNPJ', viewClient.cpfCnpj], ['Telefone', viewClient.phone], ['E-mail', viewClient.email], ['Endereço', viewClient.address], ['Processos', processCount(viewClient.id) + ' processos']].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--black-4)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ color: 'var(--white-dim)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k}</div>
                  <div style={{ color: 'var(--white)', fontSize: '13px' }}>{v || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--black-4)', padding: '12px', borderRadius: '6px' }}>
              <div style={{ color: 'var(--white-dim)', fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Acesso ao Portal</div>
              <div style={{ color: 'var(--white)', fontSize: '13px' }}><span style={{ color: 'var(--gold)' }}>Usuário:</span> {viewClient.username || '—'}</div>
              <div style={{ color: 'var(--white)', fontSize: '13px', marginTop: '2px' }}><span style={{ color: 'var(--gold)' }}>Senha:</span> {viewClient.password || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/New modal */}
      {modal !== null && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '0.08em' }}>{modal === 'new' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>Tipo</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['pessoa', 'empresa'].map(t => (
                    <button key={t} onClick={() => setForm({ ...form, type: t })} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${form.type === t ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: form.type === t ? 'rgba(201,168,76,0.12)' : 'transparent', color: form.type === t ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>{t === 'pessoa' ? 'Pessoa Física' : 'Empresa'}</button>
                  ))}
                </div>
              </div>
              {[['Nome Completo', 'name'], ['CPF/CNPJ', 'cpfCnpj'], ['E-mail (opcional)', 'email'], ['Telefone', 'phone'], ['Endereço', 'address']].map(([label, key]) => (
                <div key={key} style={key === 'address' ? { gridColumn: '1 / -1' } : {}}>
                  <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>{label}</label>
                  <input className="input-dark" type="text" value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              {/* Código de login — somente leitura no editar */}
              {modal !== 'new' && form.loginCode && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>
                    Código de Acesso (Login)
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: 1, background: 'var(--black-5)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: 'Cinzel, serif', fontSize: '22px', fontWeight: '700', letterSpacing: '0.2em', color: 'var(--gold)' }}>{form.loginCode}</span>
                      <span style={{ color: 'var(--white-dim)', fontSize: '11px' }}>— código de acesso do cliente</span>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(form.loginCode); setCopied('code'); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '10px 12px', borderRadius: '6px', background: copied === 'code' ? 'rgba(39,174,96,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${copied === 'code' ? 'rgba(39,174,96,0.25)' : 'rgba(201,168,76,0.25)'}`, color: copied === 'code' ? '#27AE60' : 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {copied === 'code' ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                    </button>
                  </div>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '5px' }}>
                  Senha do Portal
                  <span style={{ color: 'var(--gold)', fontSize: '10px', marginLeft: '8px', fontWeight: 'normal' }}>gerada automaticamente</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input className="input-dark" type="text" value={form.password || ''} onChange={e => setForm({ ...form, password: e.target.value })} style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.12em', fontSize: '15px' }} />
                  <button type="button" title="Gerar nova senha" onClick={() => setForm({ ...form, password: gerarSenha() })} style={{ padding: '10px 12px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    <RefreshCw size={14} /> Nova
                  </button>
                  <button type="button" title="Copiar senha" onClick={() => { navigator.clipboard.writeText(form.password || ''); setCopied('pass'); setTimeout(() => setCopied(null), 2000); }} style={{ padding: '10px 12px', borderRadius: '6px', background: copied === 'pass' ? 'rgba(39,174,96,0.1)' : 'rgba(201,168,76,0.1)', border: `1px solid ${copied === 'pass' ? 'rgba(39,174,96,0.25)' : 'rgba(201,168,76,0.25)'}`, color: copied === 'pass' ? '#27AE60' : 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', whiteSpace: 'nowrap' }}>
                    {copied === 'pass' ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
                <p style={{ color: 'var(--white-dim)', fontSize: '11px', marginTop: '5px' }}>Entregue esta senha ao cliente para o primeiro acesso ao portal.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
              <button className="btn-gold" onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Código gerado com sucesso */}
      {savedClient && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: 'rgba(39,174,96,0.12)', border: '1px solid rgba(39,174,96,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <BadgeCheck size={30} color="#27AE60" />
            </div>
            <h2 className="font-cinzel" style={{ color: 'var(--white)', fontSize: '16px', marginBottom: '8px' }}>Cliente Cadastrado!</h2>
            <p style={{ color: 'var(--white-dim)', fontSize: '13px', marginBottom: '24px' }}>Anote o código e entregue ao cliente para o acesso ao portal.</p>

            <div style={{ background: 'var(--black-4)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
              <p style={{ color: 'var(--white-dim)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Código de Acesso</p>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: '40px', fontWeight: '700', letterSpacing: '0.2em', marginBottom: '6px' }} className="gold-text">
                {savedClient.loginCode}
              </div>
              <p style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{savedClient.name}</p>
            </div>

            <div style={{ background: 'var(--black-4)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <p style={{ color: 'var(--white-dim)', fontSize: '11px', marginBottom: '3px' }}>SENHA</p>
                <p style={{ color: 'var(--white)', fontFamily: 'monospace', fontSize: '16px', letterSpacing: '0.1em' }}>{savedClient.password}</p>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(`Código: ${savedClient.loginCode}\nSenha: ${savedClient.password}`); }}
                style={{ padding: '8px 14px', borderRadius: '6px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Copy size={13} /> Copiar
              </button>
            </div>

            <button className="btn-gold" onClick={() => { setSavedClient(null); setModal(null); }} style={{ width: '100%', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
