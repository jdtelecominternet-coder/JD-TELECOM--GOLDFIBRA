import { useState, useEffect, useCallback } from 'react';

const PERIODS = [{ value: 'manha', label: '☀️ Manhã', desc: 'Das 08h às 12h' }, { value: 'tarde', label: '🌙 Tarde', desc: 'Das 13h às 18h' }];
const DAYS_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ─── Calendário de Agendamento ────────────────────────────────────────────────
function SmartCalendar({ selectedDate, selectedPeriod, onSelect }) {
  const today = new Date(); today.setHours(0,0,0,0);
  const [cursor, setCursor] = useState(() => { const d=new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [avail, setAvail] = useState({});
  const [loading, setLoading] = useState(false);

  const monthKey = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}`;

  const loadAvail = useCallback(async (key) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/solicitations/availability?month=${key}`);
      const d = await r.json();
      setAvail(d.days || {});
    } catch { setAvail({}); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAvail(monthKey); }, [monthKey]);

  // Primeiro dia do mês + total de dias
  const firstDay = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();

  function dayStatus(day) {
    const date = new Date(cursor.y, cursor.m, day);
    if (date < today) return 'past';
    if (date.getDay() === 0) return 'sunday'; // domingo bloqueado
    const key = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const info = avail[key];
    if (!info) return 'free';
    if (info.full) return 'full';
    const total = (info.manha?.count||0)+(info.tarde?.count||0);
    if (total >= 2) return 'almost';
    return 'free';
  }

  function dayColor(status, isSelected) {
    if (isSelected) return { bg:'#1e50b4', text:'#fff', border:'#1e50b4', cursor:'pointer' };
    if (status==='past'||status==='sunday') return { bg:'#f3f4f6', text:'#d1d5db', border:'transparent', cursor:'not-allowed' };
    if (status==='full') return { bg:'#fee2e2', text:'#b91c1c', border:'#fca5a5', cursor:'not-allowed' };
    if (status==='almost') return { bg:'#fef9c3', text:'#92400e', border:'#fde68a', cursor:'pointer' };
    return { bg:'#dcfce7', text:'#166534', border:'#86efac', cursor:'pointer' };
  }

  function selectDay(day) {
    const status = dayStatus(day);
    if (status==='past'||status==='sunday'||status==='full') return;
    const key = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onSelect(key, null); // reseta período ao trocar data
  }

  const selInfo = avail[selectedDate] || null;

  return (
    <div>
      {/* Navegação do mês */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button type="button" onClick={()=>setCursor(c=>{ const d=new Date(c.y,c.m-1,1); return {y:d.getFullYear(),m:d.getMonth()}; })}
          style={{padding:'6px 14px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',cursor:'pointer',fontSize:18}}>‹</button>
        <span style={{fontWeight:700,fontSize:15,color:'#1e3a8a'}}>{MONTHS[cursor.m]} {cursor.y}</span>
        <button type="button" onClick={()=>setCursor(c=>{ const d=new Date(c.y,c.m+1,1); return {y:d.getFullYear(),m:d.getMonth()}; })}
          style={{padding:'6px 14px',borderRadius:8,border:'1px solid #d1d5db',background:'#fff',cursor:'pointer',fontSize:18}}>›</button>
      </div>

      {/* Legenda */}
      <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        {[['#dcfce7','#166534','Disponível'],['#fef9c3','#92400e','Quase cheio'],['#fee2e2','#b91c1c','Lotado']].map(([bg,text,label])=>(
          <div key={label} style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}>
            <div style={{width:12,height:12,borderRadius:3,background:bg,border:`1px solid ${bg}`}}/>
            <span style={{color:'#6b7280'}}>{label}</span>
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:14}}>
        {DAYS_LABEL.map(d=>(
          <div key={d} style={{textAlign:'center',fontSize:11,fontWeight:700,color:'#6b7280',padding:'4px 0'}}>{d}</div>
        ))}
        {Array.from({length:firstDay}).map((_,i)=><div key={'e'+i}/>)}
        {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
          const key = `${cursor.y}-${String(cursor.m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const status = dayStatus(day);
          const isSelected = key === selectedDate;
          const c = dayColor(status, isSelected);
          return (
            <button type="button" key={day} onClick={()=>selectDay(day)}
              style={{padding:'8px 0',borderRadius:8,border:`1.5px solid ${c.border}`,background:c.bg,color:c.text,
                fontWeight:isSelected?800:600,fontSize:13,cursor:c.cursor,transition:'all .15s'}}>
              {day}
            </button>
          );
        })}
      </div>

      {loading && <p style={{textAlign:'center',fontSize:12,color:'#9ca3af'}}>Verificando disponibilidade...</p>}

      {/* Seleção de período */}
      {selectedDate && (
        <div style={{background:'#f0f9ff',border:'1.5px solid #bae6fd',borderRadius:12,padding:14}}>
          <p style={{fontWeight:700,color:'#0c4a6e',marginBottom:10,fontSize:13}}>
            📅 {selectedDate.split('-').reverse().join('/')} — Escolha o período:
          </p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {PERIODS.map(p=>{
              const info = selInfo?.[p.value];
              const isFull = info && !info.available;
              const isChosen = selectedPeriod === p.value;
              return (
                <button type="button" key={p.value}
                  disabled={!!isFull}
                  onClick={()=>!isFull && onSelect(selectedDate, p.value)}
                  style={{padding:'12px 8px',borderRadius:10,border:`2px solid ${isChosen?'#1e50b4':isFull?'#fca5a5':'#d1d5db'}`,
                    background:isChosen?'#1e50b4':isFull?'#fee2e2':'#fff',
                    color:isChosen?'#fff':isFull?'#b91c1c':'#374151',
                    cursor:isFull?'not-allowed':'pointer',textAlign:'center',opacity:isFull?0.7:1}}>
                  <div style={{fontSize:18}}>{p.value==='manha'?'☀️':'🌙'}</div>
                  <div style={{fontWeight:700,fontSize:13}}>{p.value==='manha'?'Manhã':'Tarde'}</div>
                  <div style={{fontSize:11,opacity:.8}}>{p.desc}</div>
                  {isFull
                    ? <div style={{fontSize:10,marginTop:4,fontWeight:700,color:'#b91c1c'}}>❌ LOTADO</div>
                    : <div style={{fontSize:10,marginTop:4,color:isChosen?'#bfdbfe':'#6b7280'}}>
                        {info ? `${info.count}/${2} vagas` : '2 vagas'}
                      </div>}
                </button>
              );
            })}
          </div>
          {PERIODS.every(p=>selInfo?.[p.value] && !selInfo[p.value].available) && (
            <p style={{marginTop:10,fontSize:12,color:'#b91c1c',fontWeight:600,textAlign:'center'}}>
              ⚠️ Este dia está completamente lotado. Por favor, escolha outra data.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Solicitar() {
  const [plans, setPlans] = useState([]);
  const [token, setToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | invalid | used
  const [sellerName, setSellerName] = useState('');
  const [form, setForm] = useState({ name:'', cpf:'', birth_date:'', whatsapp:'', email:'', cep:'', street:'', number:'', complement:'', neighborhood:'', city:'', state:'', plan_id:'', install_period:'', scheduled_date:'', observations:'' });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedForm, setSubmittedForm] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tk = params.get('token');
    if (!tk) { setTokenStatus('invalid'); return; }
    setToken(tk);
    fetch(`/api/solicitations/validate-token/${tk}`)
      .then(r => r.json())
      .then(d => { if (d.valid) { setSellerName(d.seller_name || ''); setTokenStatus('valid'); fetch('/api/solicitations/plans').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setPlans(d); }).catch(()=>{}); } else { setTokenStatus(d.reason === 'Token ja utilizado' ? 'used' : 'invalid'); } })
      .catch(() => setTokenStatus('invalid'));
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const capitalize = v => v.replace(/\b\w/g, c => c.toUpperCase());
  const maskCpf = v => v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');
  const maskWpp = v => { const d=v.replace(/\D/g,'').slice(0,11); if(d.length<=2) return d; if(d.length<=7) return `(${d.slice(0,2)}) ${d.slice(2)}`; return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`; };
  const maskDate = v => { const d=v.replace(/\D/g,'').slice(0,8); if(d.length<=2) return d; if(d.length<=4) return `${d.slice(0,2)}/${d.slice(2)}`; return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`; };
  const maskCep = v => { const d=v.replace(/\D/g,'').slice(0,8); return d.length<=5 ? d : `${d.slice(0,5)}-${d.slice(5)}`; };

  async function handleCep(raw) {
    const masked = maskCep(raw);
    set('cep', masked);
    if (raw.replace(/\D/g,'').length === 8) {
      try {
        const r = await fetch('https://viacep.com.br/ws/' + raw.replace(/\D/g,'') + '/json/');
        const d = await r.json();
        if (!d.erro) setForm(p => ({ ...p, cep: masked, street: d.logradouro||'', neighborhood: d.bairro||'', city: d.localidade||'', state: d.uf||'' }));
      } catch {}
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name || !form.whatsapp) return alert('Nome e WhatsApp sao obrigatorios');
    setSending(true);
    try {
      const plan = plans.find(p => String(p.id) === String(form.plan_id));
      const res = await fetch('/api/solicitations', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...form, token}) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Erro'); }
      setSubmittedForm(form);
      setSelectedPlan(plan);
      setDone(true);
    } catch(err) { alert(err.message || 'Erro ao enviar. Tente novamente.'); }
    finally { setSending(false); }
  }

  function sendWhatsApp() {
    if (!submittedForm) return;
    const num = submittedForm.whatsapp.replace(/\D/g,'');
    const plan = selectedPlan ? selectedPlan.name + (selectedPlan.speed ? ' - ' + selectedPlan.speed + ' Mbps' : '') + (selectedPlan.price ? ' - R$ ' + parseFloat(selectedPlan.price).toFixed(2) : '') : 'Nao informado';
    const addr = [submittedForm.street, submittedForm.number, submittedForm.complement, submittedForm.neighborhood, submittedForm.city, submittedForm.state].filter(Boolean).join(', ');
    const msg = encodeURIComponent(`Ola ${submittedForm.name}! 👋\n\nRecebemos sua solicitacao de instalacao da *Gold Fibra*! 🚀\n\n📋 *Resumo do Pedido:*\n• Nome: ${submittedForm.name}\n• CPF: ${submittedForm.cpf || 'Nao informado'}\n• WhatsApp: ${submittedForm.whatsapp}\n${addr ? '• Endereco: '+addr+'\n' : ''}• Plano: ${plan}\n• Periodo: ${submittedForm.install_period === 'manha' ? 'Manha' : submittedForm.install_period === 'tarde' ? 'Tarde' : 'Nao informado'}\n${submittedForm.observations ? '• Obs: '+submittedForm.observations+'\n' : ''}\nEm breve nossa equipe entrara em contato para agendar a instalacao. ✅`);
    window.open(`https://wa.me/55${num}?text=${msg}`, '_blank');
  }

  const inp = (label, key, type='text', placeholder='') => (
    <div>
      <label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>{label}</label>
      <input type={type} value={form[key]} onChange={e=>set(key,e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} />
    </div>
  );

  const header = (
    <div style={{background:'#1e50b4',color:'#fff',padding:'20px 24px',textAlign:'center',marginBottom:24}}>
      <img src="/logo-jd.png" alt="JD Telecom" style={{height:60,objectFit:'contain',marginBottom:8,display:'block',margin:'0 auto 8px'}} />
      <h1 style={{margin:0,fontSize:22,fontWeight:800}}>Solicitar Instalacao</h1>
      <p style={{margin:'4px 0 0',opacity:0.85,fontSize:14}}>Preencha seus dados e entraremos em contato</p>
    </div>
  );

  if (tokenStatus === 'checking') return (
    <div style={{minHeight:'100vh',background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial'}}>
      <p style={{color:'#555',fontSize:16}}>Verificando link...</p>
    </div>
  );

  if (tokenStatus === 'used') return (
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'Arial'}}>
      {header}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#fff',borderRadius:16,padding:48,textAlign:'center',maxWidth:420,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}>
          <div style={{fontSize:56,marginBottom:16}}>🔒</div>
          <h2 style={{color:'#dc2626',margin:'0 0 12px'}}>Link ja Utilizado</h2>
          <p style={{color:'#555',lineHeight:1.6}}>Este link ja foi usado para uma solicitacao. Solicite um novo link ao vendedor.</p>
          <p style={{color:'#888',fontSize:13,marginTop:16}}>JD Telecom — Gold Fibra</p>
        </div>
      </div>
    </div>
  );

  if (tokenStatus === 'invalid') return (
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'Arial'}}>
      {header}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#fff',borderRadius:16,padding:48,textAlign:'center',maxWidth:420,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}>
          <div style={{fontSize:56,marginBottom:16}}>❌</div>
          <h2 style={{color:'#dc2626',margin:'0 0 12px'}}>Link Invalido</h2>
          <p style={{color:'#555',lineHeight:1.6}}>Este link e invalido ou expirou. Solicite um novo link ao vendedor.</p>
          <p style={{color:'#888',fontSize:13,marginTop:16}}>JD Telecom — Gold Fibra</p>
        </div>
      </div>
    </div>
  );

  if (done) return (
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'Arial'}}>
      {header}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{background:'#fff',borderRadius:16,padding:48,textAlign:'center',maxWidth:420,boxShadow:'0 4px 24px rgba(0,0,0,0.10)'}}>
          <div style={{fontSize:56,marginBottom:16}}>✅</div>
          <h2 style={{color:'#1e50b4',margin:'0 0 12px'}}>Solicitacao Enviada!</h2>
          <p style={{color:'#555',lineHeight:1.6}}>Recebemos seu pedido. Nossa equipe entrara em contato em breve pelo WhatsApp informado.</p>
          <button onClick={sendWhatsApp}
            style={{marginTop:24,background:'#25d366',color:'#fff',border:'none',borderRadius:10,padding:'14px 24px',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,margin:'24px auto 0'}}>
            📲 Receber Confirmacao no WhatsApp
          </button>
          <p style={{color:'#888',fontSize:13,marginTop:16}}>JD Telecom — Gold Fibra</p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#f0f4ff',fontFamily:'Arial',paddingBottom:40}}>
      {header}
      <form onSubmit={submit} style={{maxWidth:600,margin:'0 auto',padding:'0 16px',display:'flex',flexDirection:'column',gap:14}}>

        {/* Banner do vendedor responsável */}
        <div style={{background:'#fff',borderRadius:12,padding:'12px 16px',boxShadow:'0 2px 8px rgba(0,0,0,0.07)',display:'flex',alignItems:'center',gap:10,border:'1px solid #c7d2fe'}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:'#e0e7ff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:18}}>🧑‍💼</div>
          <div>
            <p style={{margin:0,fontSize:11,color:'#6366f1',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Vendedor Responsável</p>
            <p style={{margin:0,fontSize:15,fontWeight:800,color:'#1e1b4b'}}>{sellerName || 'Não identificado'}</p>
          </div>
        </div>
        <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
          <p style={{fontWeight:700,color:'#1e50b4',margin:'0 0 14px',fontSize:15}}>Dados Pessoais</p>
          <div style={{display:'grid',gap:12}}>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Nome Completo *</label><input type="text" value={form.name} onChange={e=>set('name',capitalize(e.target.value))} placeholder="Seu nome completo" style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>CPF</label><input type="text" value={form.cpf} onChange={e=>set('cpf',maskCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Data de Nascimento</label><input type="text" value={form.birth_date} onChange={e=>set('birth_date',maskDate(e.target.value))} placeholder="DD/MM/AAAA" maxLength={10} style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>WhatsApp *</label><input type="tel" value={form.whatsapp} onChange={e=>set('whatsapp',maskWpp(e.target.value))} placeholder="(43) 99999-9999" style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>E-mail</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="seuemail@email.com" style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
          <p style={{fontWeight:700,color:'#1e50b4',margin:'0 0 14px',fontSize:15}}>Endereco</p>
          <div style={{display:'grid',gap:12}}>
            <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>CEP</label><input value={form.cep} onChange={e=>handleCep(e.target.value)} placeholder="00000-000" maxLength={9} style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            {inp('Rua', 'street', 'text', 'Nome da rua')}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {inp('Numero', 'number', 'text', '123')}
              {inp('Complemento', 'complement', 'text', 'Apto, casa...')}
            </div>
            {inp('Bairro', 'neighborhood', 'text', 'Nome do bairro')}
            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:12}}>
              {inp('Cidade', 'city', 'text', 'Sua cidade')}
              <div><label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>UF</label><input value={form.state} onChange={e=>set('state',e.target.value)} maxLength={2} placeholder="PR" style={{width:60,padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}} /></div>
            </div>
          </div>
        </div>

        <div style={{background:'#fff',borderRadius:12,padding:20,boxShadow:'0 2px 8px rgba(0,0,0,0.07)'}}>
          <p style={{fontWeight:700,color:'#1e50b4',margin:'0 0 14px',fontSize:15}}>Plano e Instalacao</p>
          <div style={{display:'grid',gap:16}}>
            <div>
              <label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Plano desejado</label>
              <select value={form.plan_id} onChange={e=>set('plan_id',e.target.value)} style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}}>
                <option value="">Selecione um plano</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}{p.speed ? ' - ' + p.speed + ' Mbps' : ''}{p.price ? ' - R$ ' + parseFloat(p.price).toFixed(2) : ''}</option>)}
              </select>
            </div>

            {/* Calendário inteligente */}
            <div>
              <label style={{display:'block',fontWeight:600,marginBottom:8,fontSize:13,color:'#374151'}}>
                📅 Data e período de instalação
              </label>
              <SmartCalendar
                selectedDate={form.scheduled_date}
                selectedPeriod={form.install_period}
                onSelect={(date, period) => setForm(f => ({ ...f, scheduled_date: date, install_period: period || '' }))}
              />
              {form.scheduled_date && form.install_period && (
                <div style={{marginTop:10,background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:18}}>✅</span>
                  <span style={{fontSize:13,fontWeight:600,color:'#166534'}}>
                    Agendado: {form.scheduled_date.split('-').reverse().join('/')} — {form.install_period==='manha'?'☀️ Manhã':'🌙 Tarde'}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Observacoes</label>
              <textarea value={form.observations} onChange={e=>set('observations',e.target.value)} rows={3} placeholder="Alguma informacao adicional..." style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',resize:'vertical',background:'#fff',color:'#111'}} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={sending}
          style={{background:sending?'#9ca3af':'#1e50b4',color:'#fff',border:'none',borderRadius:10,padding:'14px',fontSize:16,fontWeight:700,cursor:sending?'not-allowed':'pointer',boxShadow:'0 2px 8px rgba(30,80,180,0.3)'}}>
          {sending ? 'Enviando...' : 'Enviar Solicitacao'}
        </button>
        <p style={{textAlign:'center',fontSize:12,color:'#9ca3af',margin:0}}>JD Telecom — Gold Fibra | jdtelecom.online</p>
      </form>
    </div>
  );
}