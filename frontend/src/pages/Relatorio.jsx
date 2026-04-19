import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const BASE = 'https://jdtelecom.online';

const printCSS = `
  @media print {
    .no-print { display: none !important; }
    body { margin: 0; background: #fff; }
    .section { break-inside: avoid; }
    img { max-height: 180px !important; object-fit: cover; }
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

export default function Relatorio() {
  const { id } = useParams();
  const [os, setOs] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    fetch('/api/orders/' + id + '/report')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setOs(d))
      .catch(() => setErro(true));
  }, [id]);

  if (erro) return <div style={{padding:40,textAlign:'center',fontFamily:'Arial',color:'#e00'}}><h2>Relatório não encontrado.</h2></div>;
  if (!os) return <div style={{padding:40,textAlign:'center',fontFamily:'Arial',color:'#555'}}>Carregando relatório...</div>;

  const photos = [
    { label: 'CTO Aberta', field: 'photo_cto_open' },
    { label: 'CTO Fechada', field: 'photo_cto_closed' },
    { label: 'Sinal CTO', field: 'photo_signal_cto' },
    { label: 'Medidor', field: 'photo_meter' },
    { label: 'MAC Modem', field: 'photo_mac' },
    { label: 'Local ONU', field: 'photo_onu' },
    { label: 'Speedtest', field: 'photo_speedtest' },
  ].filter(p => os[p.field]);

  const addr = [os.client_street, os.client_number, os.client_neighborhood, os.client_city, os.client_state].filter(Boolean).join(', ');
  const dropTotal = os.drop_total ? os.drop_total + ' m' : (os.drop_start && os.drop_end ? Math.abs(parseFloat(os.drop_end)-parseFloat(os.drop_start))+' m' : null);

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
          <img src={`/logo-jd.png`} alt="JD Telecom" style={{height:70,objectFit:'contain'}} />
          <div>
            <h1 style={{margin:0,fontSize:22,letterSpacing:1}}>RELATÓRIO DE INSTALAÇÃO</h1>
            <p style={{margin:'4px 0 0',fontSize:13,opacity:0.9}}>JD TELECOM — GOLD FIBRA</p>
          </div>
        </div>

        <Section title="IDENTIFICAÇÃO DA ORDEM">
          <Row label="OS" val={os.os_number} />
          <Row label="JD" val={os.readable_id} />
          <Row label="ID Gold Fibra" val={os.gold_fibra_id} />
          <Row label="Técnico" val={os.technician_name} />
          <Row label="Vendedor" val={os.seller_name} />
          <Row label="Data" val={os.created_at ? new Date(os.created_at).toLocaleDateString('pt-BR') : null} />
          <Row label="Plano" val={os.plan_name ? os.plan_name + (os.plan_speed ? ' — ' + os.plan_speed + ' Mbps' : '') : null} />
        </Section>

        <Section title="DADOS DO CLIENTE">
          <Row label="Nome" val={os.client_name} />
          <Row label="CPF" val={os.client_cpf} />
          <Row label="WhatsApp" val={os.client_whatsapp} />
          <Row label="Endereço" val={addr} />
        </Section>

        <Section title="CTO / FIBRA">
          <Row label="Número da CTO" val={os.cto_number} />
          <Row label="Porta Utilizada" val={os.cto_port} />
          <Row label="Sinal CTO (dBm)" val={os.signal_cto ? os.signal_cto + ' dBm' : null} />
          <Row label="Sinal Cliente (dBm)" val={os.signal_client ? os.signal_client + ' dBm' : null} />
          <Row label="Lote da Fibra" val={os.fiber_lot} />
        </Section>

        <Section title="ACESSO PPPoE">
          <Row label="Usuário PPPoE" val={os.pppoe_user} />
          <Row label="Senha PPPoE" val={os.pppoe_pass} />
        </Section>

        <Section title="WI-FI">
          <Row label="Nome (SSID)" val={os.wifi_name} />
          <Row label="Senha Wi-Fi" val={os.wifi_pass} />
        </Section>

        <Section title="EQUIPAMENTO">
          <Row label="MAC do Equipamento" val={os.equipment_mac} />
        </Section>

        <Section title="CONTROLE DE MATERIAL (DROP)">
          <Row label="Número Inicial" val={os.drop_start} />
          <Row label="Número Final" val={os.drop_end} />
          <Row label="Total Utilizado" val={dropTotal} />
          <Row label="Bucha Acabamento" val={os.mat_bucha} />
          <Row label="Esticadores" val={os.mat_esticador} />
          <Row label="Conectores" val={os.mat_conector} />
          <Row label="Fixa-cabo" val={os.mat_fixa_cabo} />
        </Section>

        {os.tech_observations && (
          <Section title="OBSERVAÇÕES TÉCNICAS">
            <div style={{padding:'8px 14px',whiteSpace:'pre-wrap',fontSize:13,color:'#222'}}>{os.tech_observations}</div>
          </Section>
        )}

        {photos.length > 0 && (
          <div className="section" style={{marginBottom:16}}>
            <div style={{background:'#1e50b4',color:'#fff',borderRadius:'10px 10px 0 0',padding:'7px 14px',fontWeight:700,fontSize:13}}>
              FOTOS DA INSTALAÇÃO ({photos.length}/7)
            </div>
            <div style={{border:'1px solid #dde',borderTop:'none',borderRadius:'0 0 10px 10px',background:'#fff',padding:12,display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
              {photos.map(p => (
                <div key={p.field} style={{borderRadius:8,overflow:'hidden',border:'1px solid #dde',breakInside:'avoid'}}>
                  <div style={{background:'#e8eeff',padding:'5px 10px',fontSize:12,fontWeight:700,color:'#1e50b4'}}>{p.label}</div>
                  <img src={BASE + os[p.field]} alt={p.label} style={{width:'100%',display:'block',maxHeight:190,objectFit:'cover'}}
                    onError={e=>{ e.target.style.display='none'; }} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{textAlign:'center',fontSize:11,color:'#aaa',marginTop:8}}>
          JD Telecom — Gold Fibra | jdtelecom.online
        </div>
      </div>
    </>
  );
}
