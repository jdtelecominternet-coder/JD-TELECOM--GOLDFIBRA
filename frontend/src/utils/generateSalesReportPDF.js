import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ACCENT = [30, 80, 180];
const DARK   = [20, 20, 20];
const GRAY   = [100, 100, 100];
const LIGHT  = [240, 244, 255];
const GREEN  = [34, 197, 94];
const ORANGE = [249, 115, 22];
const RED    = [239, 68, 68];
const WHITE  = [255, 255, 255];

const sellerStatusLabel = { pendente:'Pendente', pago:'Pago', cancelado:'Cancelado', servico_concluido:'Instalado' };
function statusColor(s) {
  if (s==='pago'||s==='servico_concluido') return GREEN;
  if (s==='cancelado') return RED;
  return ORANGE;
}

export function generateSalesReportPDF(vendedor, orders) {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleString('pt-BR');

  doc.setFillColor(...ACCENT); doc.rect(0,0,W,38,'F');
  doc.setFontSize(18); doc.setFont('helvetica','bold'); doc.setTextColor(...WHITE);
  doc.text('RELATÓRIO DE VENDAS',14,16);
  doc.setFontSize(9); doc.setFont('helvetica','normal');
  doc.text('SysFlowCloudi — SysFlowCloudi',14,23);
  doc.text(`Emitido em: ${now}`,14,29);
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text(`Vendedor: ${vendedor.name||'—'}`,W-14,16,{align:'right'});
  doc.setFont('helvetica','normal'); doc.setFontSize(9);
  doc.text(`ID: ${vendedor.jd_id||'—'}`,W-14,23,{align:'right'});

  let y = 46;
  const total = orders.length;
  const totalValor = orders.reduce((s,o)=>s+(parseFloat(o.plan_price)||0),0);
  const qtdIns = orders.filter(o=>o.seller_status==='servico_concluido'||o.seller_status==='pago').length;
  const qtdPend = orders.filter(o=>!o.seller_status||o.seller_status==='pendente').length;
  const qtdCanc = orders.filter(o=>o.seller_status==='cancelado').length;

  const boxes = [
    {label:'Total Vendas',value:String(total),color:ACCENT},
    {label:'Valor Total',value:`R$ ${totalValor.toFixed(2).replace('.',',')}`,color:ACCENT},
    {label:'Instalado/Pago',value:String(qtdIns),color:GREEN},
    {label:'Pendente',value:String(qtdPend),color:ORANGE},
    {label:'Cancelado',value:String(qtdCanc),color:RED},
  ];
  const bW = (W-28)/boxes.length;
  boxes.forEach((b,i)=>{
    const x=14+i*(bW+2);
    doc.setFillColor(...b.color); doc.roundedRect(x,y,bW,18,3,3,'F');
    doc.setTextColor(...WHITE); doc.setFont('helvetica','bold'); doc.setFontSize(13);
    doc.text(b.value,x+bW/2,y+8,{align:'center'});
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(b.label,x+bW/2,y+14,{align:'center'});
  });
  y+=26;

  doc.setTextColor(...DARK); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('Detalhes das Vendas',14,y); y+=4;

  const rows = orders.map(o=>{
    const data = o.scheduled_date ? new Date(o.scheduled_date).toLocaleDateString('pt-BR') : new Date(o.created_at).toLocaleDateString('pt-BR');
    const valor = o.plan_price ? `R$ ${parseFloat(o.plan_price).toFixed(2).replace('.',',')}` : '—';
    const status = sellerStatusLabel[o.seller_status||'pendente']||o.seller_status;
    return [o.readable_id||o.os_number, o.client_name||'—', o.plan_name||'—', valor, status, data];
  });

  autoTable(doc,{
    startY:y,
    head:[['OS / ID','Cliente','Plano','Valor','Status','Data']],
    body:rows,
    styles:{fontSize:8,cellPadding:3,textColor:DARK},
    headStyles:{fillColor:ACCENT,textColor:WHITE,fontStyle:'bold',fontSize:8},
    alternateRowStyles:{fillColor:LIGHT},
    columnStyles:{0:{cellWidth:28,fontStyle:'bold'},1:{cellWidth:45},2:{cellWidth:35},3:{cellWidth:22,halign:'right'},4:{cellWidth:22,halign:'center'},5:{cellWidth:22,halign:'center'}},
    didDrawCell:(data)=>{
      if(data.section==='body'&&data.column.index===4){
        const s=orders[data.row.index]?.seller_status||'pendente';
        const col=statusColor(s);
        doc.setFillColor(...col);
        const {x,y:cy,width,height}=data.cell;
        doc.roundedRect(x+1,cy+1,width-2,height-2,2,2,'F');
        doc.setTextColor(...WHITE); doc.setFontSize(7);
        doc.text(sellerStatusLabel[s]||s,x+width/2,cy+height/2+1,{align:'center'});
        data.cell.text=[];
      }
    },
    margin:{left:14,right:14},theme:'grid',
  });

  const pages=doc.internal.getNumberOfPages();
  for(let i=1;i<=pages;i++){
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(...GRAY);
    doc.text(`Página ${i} de ${pages} — SysFlowCloudi / SysFlowCloudi`,W/2,290,{align:'center'});
  }

  const safe=(vendedor.name||'vendedor').replace(/\s+/g,'_');
  doc.save(`relatorio_vendas_${safe}_${Date.now()}.pdf`);
}