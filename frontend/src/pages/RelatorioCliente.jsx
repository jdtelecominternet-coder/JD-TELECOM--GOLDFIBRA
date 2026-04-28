import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const printCSS = `
  @media print {
    .no-print { display: none !important; }
    body { margin: 0; background: #fff; }
    .section { break-inside: avoid; }
  }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; background: #f5f7ff; }
`;

const Section = ({ title, color, children }) => (
  <div className="section" style={{border:'1px solid #dde',borderRadius:10,marginBottom:16,overflow:'hidden'}}>
    <div style={{background: color||'#1e50b4',color:'#fff',padding:'7px 14px',fontWeight:700,fontSize:13}}>{title}</div>
    <div style={{background:'#fff',padding:'4px 0'}}>{children}</div>
  </div>
);

const Row = ({ label, val }) => !val ? null : (
  <div style={{display:'flex',borderBottom:'1px solid #f0f0f0',padding:'5px 14px',gap:8}}>
    <span style={{fontWeight:700,color:'#555',minWidth:160,flexShrink:0,fontSize:13}}>{label}</span>
    <span style={{color:'#222',fontSize:13}}>{val}</span>
  </div>
);

export default function RelatorioCliente() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch('/api/clients/' + id + '/report')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setC(d))
      .catch(() => setErro(true));
  }, [id]);

  if (erro) return <div style={{padding:40,textAlign:'center',fontFamily:'Arial',color:'#e00'}}><h2>Relatório não encontrado.</h2></div>;
  if (!c) return <div style={{padding:40,textAlign:'center',fontFamily:'Arial',color:'#555'}}>Carregando relatório...</div>;

  const addr = [c.street, c.number, c.neighborhood, c.city, c.state].filter(Boolean).join(', ');

  return (
    <>
      <style>{printCSS}</style>
      <div style={{maxWidth:780,margin:'0 auto',padding:'20px 14px'}}>

        <div className="no-print" style={{textAlign:'center',marginBottom:20}}>
          <button onClick={()=>window.print()}
            style={{background:'#1e50b4',color:'#fff',border:'none',borderRadius:8,padding:'12px 40px',fontSize:16,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(30,80,180,0.3)'}}>
            Salvar / Imprimir PDF
          </button>
        </div>

        <div style={{background:'#1e50b4',color:'#fff',borderRadius:12,padding:'18px 24px',textAlign:'center',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'center',gap:20}}>
          <img src="/logo-jd.png" alt="SysFlowCloudi" style={{height:70,objectFit:'contain'}} />
          <div>
            <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>RELATÓRIO DE PEDIDO</h1>
            <p style={{margin:'4px 0 0',fontSize:13,opacity:0.9}}>SysFlowCloudi — SysFlowCloudi</p>
          </div>
        </div>

        <Section title="DADOS DO CLIENTE">
          <Row label="Nome" val={c.name} />
          <Row label="CPF" val={c.cpf} />
          <Row label="RG" val={c.rg} />
          <Row label="Data de Nascimento" val={c.birth_date ? new Date(c.birth_date).toLocaleDateString('pt-BR') : null} />
          <Row label="WhatsApp" val={c.whatsapp} />
          <Row label="E-mail" val={c.email} />
        </Section>

        <Section title="ENDEREÇO">
          <Row label="Rua" val={c.street} />
          <Row label="Número" val={c.number} />
          <Row label="Complemento" val={c.complement} />
          <Row label="Bairro" val={c.neighborhood} />
          <Row label="Cidade" val={c.city} />
          <Row label="Estado" val={c.state} />
          <Row label="CEP" val={c.zip_code} />
          {addr && <Row label="Endereço Completo" val={addr} />}
        </Section>

        <Section title="PLANO / SERVIÇO">
          <Row label="Plano" val={c.plan} />
          <Row label="Velocidade" val={c.plan_speed ? c.plan_speed + ' Mbps' : null} />
          <Row label="Valor Mensal" val={c.monthly_value ? 'R$ ' + parseFloat(c.monthly_value).toFixed(2) : null} />
          <Row label="Dia de Vencimento" val={c.due_day} />
          <Row label="ID SysFlowCloudi" val={c.gold_fibra_id} />
        </Section>

        {(c.pppoe_user || c.pppoe_pass) && (
          <Section title="ACESSO PPPoE">
            <Row label="Usuário PPPoE" val={c.pppoe_user} />
            <Row label="Senha PPPoE" val={c.pppoe_pass} />
          </Section>
        )}

        {(c.wifi_name || c.wifi_pass) && (
          <Section title="WI-FI">
            <Row label="Nome (SSID)" val={c.wifi_name} />
            <Row label="Senha Wi-Fi" val={c.wifi_pass} />
          </Section>
        )}

        <Section title="INFORMAÇÕES DO PEDIDO">
          <Row label="Status" val={c.status} />
          <Row label="Vendedor" val={c.seller_name} />
          <Row label="Data de Cadastro" val={c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : null} />
          <Row label="Observações" val={c.observations} />
        </Section>

        <div style={{textAlign:'center',fontSize:11,color:'#aaa',marginTop:8}}>
          SysFlowCloudi — SysFlowCloudi | jdtelecom.online
        </div>
      </div>
    </>
  );
}
