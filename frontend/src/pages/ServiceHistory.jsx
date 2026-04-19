import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Search, RefreshCw, ChevronDown, ChevronUp, ZoomIn, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AdminDeleteModal from '../components/AdminDeleteModal';

const statusLabel = { pendente:'Pendente', em_deslocamento:'Em Deslocamento', em_execucao:'Em Execucao', finalizado:'Finalizado', cancelado:'Cancelado' };

const PHOTO_LABELS = {
  photo_cto_open: 'CTO Aberta',
  photo_cto_closed: 'CTO Fechada',
  photo_signal_cto: 'Sinal CTO',
  photo_meter: 'Sinal Cliente',
  photo_mac: 'MAC/Equipamento',
  photo_onu: 'ONU',
  photo_speedtest: 'Speedtest',
};

function PhotoGrid({ order }) {
  const [zoom, setZoom] = useState(null);
  const photos = Object.entries(PHOTO_LABELS).filter(([k]) => order[k]);
  if (photos.length === 0) return <p className="text-xs italic" style={{color:'var(--text-muted)'}}>Nenhuma foto registrada</p>;
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {photos.map(([key, label]) => (
          <div key={key} className="relative group cursor-pointer rounded-lg overflow-hidden border" style={{borderColor:'var(--border)'}} onClick={() => setZoom(order[key])}>
            <img src={order[key]} alt={label} className="w-full h-28 object-cover" onError={e=>e.target.style.display='none'} />
            <a href={order[key]} download target="_blank" rel="noreferrer"
              style={{position:'absolute',top:'4px',right:'4px',zIndex:30,background:'rgba(0,0,0,0.75)',borderRadius:'50%',padding:'5px',display:'flex',alignItems:'center',justifyContent:'center'}}
              title="Baixar foto" onClick={e=>e.stopPropagation()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/></svg>
            </a>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
            <p className="text-xs text-center py-1 font-medium" style={{background:'var(--bg-input)',color:'var(--text-secondary)'}}>{label}</p>
          </div>
        ))}
      </div>
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setZoom(null)}>
          <img src={zoom} alt="Foto" className="max-w-full max-h-full rounded-xl shadow-2xl" style={{maxHeight:'90vh'}} />
        </div>
      )}
    </>
  );
}

function OrderCard({ order, onDelete, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addr = [order.client_street, order.client_number, order.client_neighborhood, order.client_city, order.client_state].filter(Boolean).join(', ');

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete('/orders/' + order.id);
      toast.success('Ordem deletada');
      onDelete(order.id);
    } catch { toast.error('Erro ao deletar'); }
    finally { setDeleting(false); }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setOpen(p => !p)}
        style={{background: open ? 'var(--bg-input)' : 'transparent'}}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm font-mono" style={{color:'var(--accent)'}}>{order.readable_id||order.os_number}</span>
            {order.gold_fibra_id && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'#f59e0b22',color:'#f59e0b'}}>ID GoldFibra: {order.gold_fibra_id}</span>}
            <span className={`badge-${order.status}`}>{statusLabel[order.status]||order.status}</span>
            {order.tipo_ordem_servico && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{background:'rgba(99,102,241,0.15)',color:'#818cf8'}}>
                {order.tipo_ordem_servico}
              </span>
            )}
            {order.finished_at && <span className="text-xs" style={{color:'var(--text-muted)'}}>{new Date(order.finished_at).toLocaleDateString('pt-BR')}</span>}
            {order.valor_servico != null && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{background:'#10b98122',color:'#10b981'}}>
                R$ {Number(order.valor_servico).toFixed(2).replace('.',',')}
              </span>
            )}
            {order.status === 'finalizado' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{background: order.status_pagamento_tecnico==='pago' ? '#22c55e22':'#f59e0b22', color: order.status_pagamento_tecnico==='pago' ? '#22c55e':'#f59e0b'}}>
                {order.status_pagamento_tecnico==='pago' ? '✔ Pago':'⏳ Pendente'}
              </span>
            )}
          </div>
          <p className="font-semibold mt-0.5 truncate" style={{color:'var(--text-primary)'}}>{order.client_name}</p>
          {addr && <p className="text-xs truncate" style={{color:'var(--text-muted)'}}>{addr}</p>}
          <p className="text-xs" style={{color:'var(--text-muted)'}}>
            Tecnico: {order.technician_name||'—'} · Vendedor: {order.seller_name||'—'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2" onClick={e=>e.stopPropagation()}>
          {isAdmin && (
            <button onClick={() => setConfirmDelete(true)} disabled={deleting}
              className="p-2 rounded-lg transition-colors"
              style={{background:'#ef444422',color:'#ef4444'}}
              title="Deletar ordem">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <span onClick={()=>setOpen(p=>!p)}>
            {open ? <ChevronUp className="w-5 h-5" style={{color:'var(--text-muted)'}} /> : <ChevronDown className="w-5 h-5" style={{color:'var(--text-muted)'}} />}
          </span>
        </div>
      </div>

      <AdminDeleteModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        itemName={`OS ${order.readable_id || order.os_number} — ${order.client_name}`}
        onConfirmed={handleDelete}
      />

      {open && (
        <div className="p-4 space-y-4" style={{borderTop:'1px solid var(--border)'}}>
          {/* Dados do cliente */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:'var(--text-muted)'}}>Dados do Cliente</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['Nome', order.client_name],
                ['CPF', order.client_cpf],
                ['WhatsApp', order.client_whatsapp],
                ['Endereco', addr],
                ['Plano', order.plan_name ? order.plan_name + (order.plan_speed ? ' — ' + order.plan_speed + ' Mbps' : '') : null],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} className="p-2 rounded-lg" style={{background:'var(--bg-input)'}}>
                  <p className="text-xs" style={{color:'var(--text-muted)'}}>{label}</p>
                  <p className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dados tecnicos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:'var(--text-muted)'}}>Dados Tecnicos</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                ['PPPoE', order.pppoe_user],
                ['Senha PPPoE', order.pppoe_pass],
                ['CTO', order.cto_number],
                ['Porta CTO', order.cto_port],
                ['Sinal CTO', order.signal_cto ? order.signal_cto + ' dBm' : null],
                ['Sinal Cliente', order.signal_client ? order.signal_client + ' dBm' : null],
                ['MAC/MEC', order.equipment_mac || order.mac_equipment],
                ['Lote Fibra', order.fiber_lot],
                ['Wi-Fi Nome', order.wifi_name || order.wifi_ssid],
                ['Wi-Fi Senha', order.wifi_pass],
              ].filter(([,v]) => v).map(([label, value]) => (
                <div key={label} className="p-2 rounded-lg" style={{background:'var(--bg-input)'}}>
                  <p className="text-xs" style={{color:'var(--text-muted)'}}>{label}</p>
                  <p className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fotos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:'var(--text-muted)'}}>Fotos do Servico</p>
            <PhotoGrid order={order} />
          </div>

          {order.tech_observations && (
            <div className="p-3 rounded-lg" style={{background:'var(--bg-input)'}}>
              <p className="text-xs font-semibold mb-1" style={{color:'var(--text-muted)'}}>Observacoes</p>
              <p className="text-sm" style={{color:'var(--text-primary)'}}>{order.tech_observations}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ServiceHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/orders');
      setOrders(r.data.filter(o => o.status === 'finalizado'));
    } catch { toast.error('Erro ao carregar historico'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.client_name?.toLowerCase().includes(q)
      || o.readable_id?.toLowerCase().includes(q)
      || o.technician_name?.toLowerCase().includes(q)
      || o.os_number?.toLowerCase().includes(q)
      || o.gold_fibra_id?.toString().includes(q);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{color:'var(--text-primary)'}}>Servicos Executados</h1>
          <p className="text-sm" style={{color:'var(--text-muted)'}}>{filtered.length} ordem(s) finalizada(s)</p>
        </div>
        <button onClick={load} className="btn-secondary p-2" title="Atualizar"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{color:'var(--text-muted)'}} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, OS, tecnico ou ID GoldFibra..." className="input pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'var(--accent)',borderTopColor:'transparent'}} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16" style={{color:'var(--text-muted)'}}>Nenhum servico finalizado encontrado</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(o => <OrderCard key={o.id} order={o} onDelete={id=>setOrders(p=>p.filter(x=>x.id!==id))} isAdmin={user?.role==='admin'} />)}
        </div>
      )}
    </div>
  );
}