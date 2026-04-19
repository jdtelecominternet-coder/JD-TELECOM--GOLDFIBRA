import { useState, useEffect } from 'react';

const PERIODS = [{ value: 'manha', label: 'Manha' }, { value: 'tarde', label: 'Tarde' }];

export default function Solicitar() {
  const [plans, setPlans] = useState([]);
  const [token, setToken] = useState('');
  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | invalid | used
  const [sellerName, setSellerName] = useState('');
  const [form, setForm] = useState({ name:'', cpf:'', birth_date:'', whatsapp:'', email:'', cep:'', street:'', number:'', complement:'', neighborhood:'', city:'', state:'', plan_id:'', install_period:'', observations:'' });
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
          <div style={{display:'grid',gap:12}}>
            <div>
              <label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Plano desejado</label>
              <select value={form.plan_id} onChange={e=>set('plan_id',e.target.value)} style={{width:'100%',padding:'10px 12px',border:'1px solid #d1d5db',borderRadius:8,fontSize:14,boxSizing:'border-box',background:'#fff',color:'#111'}}>
                <option value="">Selecione um plano</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}{p.speed ? ' - ' + p.speed + ' Mbps' : ''}{p.price ? ' - R$ ' + parseFloat(p.price).toFixed(2) : ''}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontWeight:600,marginBottom:4,fontSize:13,color:'#374151'}}>Periodo preferido de instalacao</label>
              <div style={{display:'flex',gap:12}}>
                {PERIODS.map(p => (
                  <label key={p.value} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontWeight:form.install_period===p.value?700:400,color:form.install_period===p.value?'#1e50b4':'#555'}}>
                    <input type="radio" name="period" value={p.value} checked={form.install_period===p.value} onChange={()=>set('install_period',p.value)} />
                    {p.label}
                  </label>
                ))}
              </div>
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