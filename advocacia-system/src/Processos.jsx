import { useState } from 'react';
import { getProcesses, getClients, addProcess, updateProcess, deleteProcess, addMovement, getClientById } from './store';
import { StatusBadge } from './Dashboard';
import { Plus, Search, Trash2, Edit, ChevronDown, ChevronUp, Upload, X } from 'lucide-react';

const TIPOS = ['Ação Civil Ordinária', 'Reclamação Trabalhista', 'Divórcio', 'Inventário', 'Ação Penal', 'Mandado de Segurança', 'Habeas Corpus', 'Ação de Cobrança', 'Outro'];

export default function Processos({ user }) {
  const [processes, setProcesses] = useState(getProcesses());
  const [clients] = useState(getClients());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [modal, setModal] = useState(null); // null | 'new' | process_id
  const [form, setForm] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [newMovement, setNewMovement] = useState('');

  const reload = () => setProcesses(getProcesses());

  const filtered = processes.filter(p => {
    const matchSearch = p.number.includes(search) || p.type.toLowerCase().includes(search.toLowerCase()) || getClientById(p.clientId)?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  function openNew() { setForm({ status: 'andamento', honorarios: '', honorariosPago: '0', lawyerId: user.id }); setModal('new'); }
  function openEdit(p) { setForm({ ...p }); setModal(p.id); }

  function handleSave() {
    if (modal === 'new') {
      addProcess(form);
    } else {
      updateProcess(modal, form);
    }
    reload();
    setModal(null);
  }

  function handleDelete(id) {
    if (confirm('Excluir este processo?')) { deleteProcess(id); reload(); }
  }

  function handleAddMovement(processId) {
    if (!newMovement.trim()) return;
    addMovement(processId, newMovement, user.name);
    setNewMovement('');
    reload();
  }

  const getClientName = (id) => clients.find(c => c.id === id)?.name || '—';

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="font-cinzel" style={{ fontSize: '20px', color: 'var(--white)' }}>Processos</h1>
          <p style={{ color: 'var(--white-dim)', fontSize: '13px' }}>{processes.length} processos cadastrados</p>
        </div>
        <button className="btn-gold" onClick={openNew} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Novo Processo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--white-dim)' }} />
          <input className="input-dark" style={{ paddingLeft: '36px' }} placeholder="Buscar por número, tipo ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['todos', 'andamento', 'finalizado', 'aguardando'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: '8px 16px', borderRadius: '6px', border: `1px solid ${statusFilter === s ? 'var(--gold)' : 'rgba(201,168,76,0.2)'}`, background: statusFilter === s ? 'rgba(201,168,76,0.12)' : 'transparent', color: statusFilter === s ? 'var(--gold)' : 'var(--white-dim)', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize' }}>
            {s === 'todos' ? 'Todos' : s}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map(p => (
          <div key={p.id} className="card">
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer' }} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--gold)', letterSpacing: '0.02em' }}>{p.number}</span>
                  <StatusBadge status={p.status} />
                </div>
                <div style={{ color: 'var(--white)', fontSize: '14px', marginBottom: '2px' }}>{p.type}</div>
                <div style={{ color: 'var(--white-dim)', fontSize: '12px' }}>{getClientName(p.clientId)} • {p.vara}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: 'var(--gold)', fontSize: '14px', fontWeight: '600' }}>R$ {(p.honorarios || 0).toLocaleString('pt-BR')}</div>
                <div style={{ color: 'var(--white-dim)', fontSize: '11px' }}>honorários</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(p)} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', color: 'var(--gold)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><Edit size={14} /></button>
                <button onClick={() => handleDelete(p.id)} style={{ background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', color: 'var(--red)', borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}><Trash2 size={14} /></button>
              </div>
              {expanded === p.id ? <ChevronUp size={16} color="var(--white-dim)" /> : <ChevronDown size={16} color="var(--white-dim)" />}
            </div>

            {/* Expanded */}
            {expanded === p.id && (
              <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                <div style={{ paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Details */}
                  <div>
                    <h4 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '12px' }}>DETALHES</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[['Vara / Juiz', `${p.vara} — ${p.judge || '—'}`], ['Honorários Pagos', `R$ ${(p.honorariosPago || 0).toLocaleString('pt-BR')}`], ['Descrição', p.description || '—']].map(([k, v]) => (
                        <div key={k}><span style={{ color: 'var(--white-dim)', fontSize: '11px' }}>{k}: </span><span style={{ color: 'var(--white)', fontSize: '13px' }}>{v}</span></div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h4 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '11px', letterSpacing: '0.1em', marginBottom: '12px' }}>MOVIMENTAÇÕES</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto', marginBottom: '12px' }}>
                      {(p.movements || []).map((m, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, marginTop: '5px' }} />
                          <div>
                            <div style={{ color: 'var(--white)', fontSize: '12px' }}>{m.text}</div>
                            <div style={{ color: 'var(--white-dim)', fontSize: '10px' }}>{new Date(m.date).toLocaleDateString('pt-BR')} — {m.author}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input className="input-dark" style={{ fontSize: '12px', padding: '8px 12px' }} placeholder="Nova movimentação..." value={newMovement} onChange={e => setNewMovement(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMovement(p.id)} />
                      <button className="btn-gold" onClick={() => handleAddMovement(p.id)} style={{ padding: '8px 14px', borderRadius: '6px', fontSize: '12px', whiteSpace: 'nowrap' }}>Adicionar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--white-dim)' }}>
            <p style={{ fontSize: '14px' }}>Nenhum processo encontrado.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 className="font-cinzel" style={{ color: 'var(--gold)', fontSize: '16px', letterSpacing: '0.08em' }}>{modal === 'new' ? 'Novo Processo' : 'Editar Processo'}</h2>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--white-dim)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {[['Número do Processo', 'number', 'text'], ['Vara / Comarca', 'vara', 'text'], ['Juiz', 'judge', 'text'], ['Honorários (R$)', 'honorarios', 'number'], ['Honorários Pagos (R$)', 'honorariosPago', 'number']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{label}</label>
                  <input className="input-dark" type={type} value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Tipo de Ação</label>
                <select className="input-dark" value={form.type || ''} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="">Selecione...</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Cliente</label>
                <select className="input-dark" value={form.clientId || ''} onChange={e => setForm({ ...form, clientId: e.target.value })}>
                  <option value="">Selecione...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Status</label>
                <select className="input-dark" value={form.status || 'andamento'} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {['andamento', 'aguardando', 'finalizado'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--white-dim)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>Descrição</label>
                <textarea className="input-dark" rows={3} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button className="btn-outline" onClick={() => setModal(null)} style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '13px' }}>Cancelar</button>
              <button className="btn-gold" onClick={handleSave} style={{ padding: '10px 24px', borderRadius: '8px', fontSize: '13px' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
